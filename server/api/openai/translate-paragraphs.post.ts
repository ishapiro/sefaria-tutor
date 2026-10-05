import { createError, defineEventHandler, readBody } from 'h3'
import { useRuntimeConfig } from 'nitropack/runtime/internal/config'
import { $fetch } from 'ofetch'
import { validateAuth } from '~/server/utils/auth'
import { resolveTranslationModel } from '~/server/utils/translation-model'
import { getDefaultTranslationModel, saveDefaultTranslationModel } from '~/server/utils/system-settings'
import { normalizePhrase, computePhraseHash, computeHash, CACHE_TTL_SECONDS } from '~/server/utils/cache'
import { getCachedEffort, markEffortUnsupported, isUnsupportedEffortError, type ReasoningEffort } from '~/server/utils/openai-reasoning'
import { createOpenAIError, parseOpenAIError } from '~/server/utils/openai-errors'

const PARAGRAPH_TRANSLATION_INSTRUCTIONS = `You are an expert translator of Hebrew and Aramaic Jewish texts (Tanakh, Mishnah, Talmud, liturgy, commentaries).

You will be given numbered paragraphs of Hebrew or Aramaic text. Translate each paragraph into clear, faithful, readable English.

Rules:
- Translate every paragraph, in order, one English translation per input paragraph.
- Give only the translation: no commentary, notes, transliteration, explanations, or brackets for added words unless needed for sense.
- Keep names in their common English forms (e.g. Moses, Abraham, Rabbi Yoḥanan).
- Do not merge or split paragraphs.

Return JSON: {"translations": ["<translation of paragraph 1>", "<translation of paragraph 2>", ...]}`

const PARAGRAPH_TRANSLATION_CACHE_VERSION = 1
const MAX_PARAGRAPHS = 10
const MAX_TOTAL_CHARS = 12000

/** Extract text from Responses API output; same shape as sentence-grammar.post.ts */
function extractTextFromResponse (response: {
  output?: Array<{ type?: string; content?: Array<{ type?: string; text?: string }> }>
}): string {
  const output = response?.output ?? []
  const parts: string[] = []
  for (const item of output) {
    if (item.type !== 'message' || !Array.isArray(item.content)) continue
    for (const c of item.content) {
      if (c.type === 'output_text' && typeof c.text === 'string') parts.push(c.text)
    }
  }
  return parts.join('').trim()
}

/** Output budget: ~8 tokens per Hebrew word (English is longer, plus JSON) + headroom for reasoning. */
function estimateMaxOutputTokens (paragraphs: string[]): number {
  const wordCount = paragraphs.join(' ').split(/\s+/).filter(Boolean).length
  return Math.min(Math.max(wordCount * 8 + 2000, 2500), 12000)
}

function isMissingTableError (err: unknown): boolean {
  const msg = err instanceof Error ? err.message : String(err)
  return msg.includes('no such table') || msg.includes('paragraph_translation_cache')
}

export default defineEventHandler(async (event) => {
  validateAuth(event)
  const config = useRuntimeConfig(event)
  const env = (globalThis as unknown as { process?: { env?: Record<string, string> } }).process?.env
  const openaiApiKey = config.openaiApiKey || env?.OPENAI_API_KEY || ''

  if (!openaiApiKey) {
    throw createError({
      statusCode: 500,
      statusMessage: 'Server configuration error',
      message: 'OpenAI API key not configured',
    })
  }

  const body = await readBody<{ paragraphs?: unknown }>(event)
  const rawParagraphs = body?.paragraphs
  if (!Array.isArray(rawParagraphs) || rawParagraphs.length === 0 || rawParagraphs.some(p => typeof p !== 'string')) {
    throw createError({
      statusCode: 400,
      statusMessage: 'Bad Request',
      message: 'Body must include a non-empty "paragraphs" array of strings',
    })
  }
  if (rawParagraphs.length > MAX_PARAGRAPHS) {
    throw createError({
      statusCode: 400,
      statusMessage: 'Bad Request',
      message: `Too many paragraphs (max ${MAX_PARAGRAPHS} per request)`,
    })
  }
  const normalized = (rawParagraphs as string[]).map(p => normalizePhrase(p))
  const totalChars = normalized.reduce((sum, p) => sum + p.length, 0)
  if (totalChars > MAX_TOTAL_CHARS) {
    throw createError({
      statusCode: 400,
      statusMessage: 'Bad Request',
      message: `Paragraphs too long (max ${MAX_TOTAL_CHARS} characters per request)`,
    })
  }

  // @ts-ignore - Cloudflare D1 binding
  const db = event.context.cloudflare?.env?.DB
  const promptHash = await computeHash(PARAGRAPH_TRANSLATION_INSTRUCTIONS)
  const hashes = await Promise.all(normalized.map(p => computePhraseHash(p)))
  const translations: Array<string | null> = normalized.map(p => (p ? null : ''))

  // Attempt D1 cache lookup before calling OpenAI
  if (db) {
    try {
      const uniqueHashes = [...new Set(hashes)]
      const placeholders = uniqueHashes.map(() => '?').join(', ')
      const result = await db
        .prepare(
          `SELECT paragraph_hash, paragraph, translation, created_at, version, prompt_hash FROM paragraph_translation_cache WHERE paragraph_hash IN (${placeholders})`,
        )
        .bind(...uniqueHashes)
        .all() as {
        results?: Array<{
          paragraph_hash: string
          paragraph: string
          translation: string
          created_at: number
          version: number
          prompt_hash: string
        }>
      }
      const now = Math.floor(Date.now() / 1000)
      const byHash = new Map((result?.results ?? []).map(r => [r.paragraph_hash, r]))
      hashes.forEach((hash, i) => {
        const row = byHash.get(hash)
        if (
          row &&
          translations[i] === null &&
          row.paragraph === normalized[i] &&
          row.version === PARAGRAPH_TRANSLATION_CACHE_VERSION &&
          row.prompt_hash === promptHash &&
          now - row.created_at < CACHE_TTL_SECONDS
        ) {
          translations[i] = row.translation
        }
      })
    } catch (dbErr) {
      if (isMissingTableError(dbErr)) {
        console.warn(
          '[openai/translate-paragraphs] Cache table missing (run migration 0023_paragraph_translation_cache.sql for local D1)',
        )
      } else {
        console.error('[openai/translate-paragraphs] Cache read error:', dbErr)
      }
      // On any cache error, fall through to OpenAI call.
    }
  }

  const missIndexes = translations.map((t, i) => (t === null ? i : -1)).filter(i => i >= 0)
  const cachedCount = normalized.length - missIndexes.length
  if (missIndexes.length === 0) {
    console.log('[openai/translate-paragraphs][cache] HIT', { count: normalized.length })
    return { translations: translations as string[], cachedCount, fromCache: true as const }
  }

  const configuredModel = await getDefaultTranslationModel(db)
  const resolvedModel = await resolveTranslationModel(openaiApiKey, db, configuredModel)
  const model = resolvedModel.model

  if (resolvedModel.source === 'auto' && configuredModel !== model) {
    try {
      await saveDefaultTranslationModel(db, model)
    } catch (e) {
      console.error('[openai/translate-paragraphs] Failed to persist auto-selected model:', e)
    }
  }

  const missParagraphs = missIndexes.map(i => normalized[i]!)
  const input = missParagraphs.map((p, n) => `Paragraph ${n + 1}:\n${p}`).join('\n\n')
  const maxOutputTokens = estimateMaxOutputTokens(missParagraphs)

  type TranslateResponse = { output?: Array<{ type?: string; content?: Array<{ type?: string; text?: string }> }> }

  async function callOpenAI (effort: ReasoningEffort) {
    return $fetch<TranslateResponse>('https://api.openai.com/v1/responses', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${openaiApiKey}` },
      body: {
        model,
        instructions: PARAGRAPH_TRANSLATION_INSTRUCTIONS,
        input,
        max_output_tokens: maxOutputTokens,
        reasoning: { effort },
        text: {
          verbosity: 'medium' as const,
          format: {
            type: 'json_schema' as const,
            name: 'paragraph_translations',
            strict: true,
            schema: {
              type: 'object',
              properties: {
                translations: { type: 'array', items: { type: 'string' } },
              },
              required: ['translations'],
              additionalProperties: false,
            },
          },
        },
      },
    })
  }

  console.log('[openai/translate-paragraphs] START', {
    paragraphs: normalized.length,
    misses: missIndexes.length,
    chars: totalChars,
    maxOutputTokens,
    model,
  })

  try {
    const effort = getCachedEffort(model)
    let response: TranslateResponse
    const callStart = Date.now()
    try {
      response = await callOpenAI(effort)
    } catch (err) {
      if (isUnsupportedEffortError(err)) {
        markEffortUnsupported(model, effort)
        response = await callOpenAI(getCachedEffort(model))
      } else {
        throw err
      }
    }
    console.log('[openai/translate-paragraphs] DONE', {
      misses: missIndexes.length,
      durationMs: Date.now() - callStart,
      model,
    })

    const text = extractTextFromResponse(response)
    let parsed: string[] | null = null
    try {
      const obj = JSON.parse(text) as { translations?: unknown }
      if (Array.isArray(obj?.translations) && obj.translations.every(t => typeof t === 'string')) {
        parsed = obj.translations as string[]
      }
    } catch {
      parsed = null
    }
    if (!parsed || parsed.length !== missIndexes.length) {
      console.error('[openai/translate-paragraphs] Unexpected response', {
        textPreview: text.slice(0, 200),
        expected: missIndexes.length,
        got: parsed?.length ?? null,
      })
      throw createError({
        statusCode: 502,
        statusMessage: 'Bad Gateway',
        message: 'Translation failed: unexpected response from OpenAI',
      })
    }

    missIndexes.forEach((idx, n) => {
      translations[idx] = parsed![n]!.trim()
    })

    // Store new translations in D1 cache
    if (db) {
      try {
        const now = Math.floor(Date.now() / 1000)
        const stmt = db.prepare(
          'INSERT OR REPLACE INTO paragraph_translation_cache (paragraph_hash, paragraph, translation, created_at, version, prompt_hash) VALUES (?, ?, ?, ?, ?, ?)',
        )
        await db.batch(
          missIndexes
            .filter(idx => translations[idx])
            .map(idx => stmt.bind(hashes[idx], normalized[idx], translations[idx], now, PARAGRAPH_TRANSLATION_CACHE_VERSION, promptHash)),
        )
        console.log('[openai/translate-paragraphs][cache] MISS – stored translations', {
          stored: missIndexes.length,
          cachedCount,
        })
      } catch (dbWriteErr) {
        if (isMissingTableError(dbWriteErr)) {
          console.warn(
            '[openai/translate-paragraphs] Cache table missing on write (run migration 0023_paragraph_translation_cache.sql for local D1)',
          )
        } else {
          console.error('[openai/translate-paragraphs] Cache write error:', dbWriteErr)
        }
      }
    }

    return { translations: translations as string[], cachedCount }
  } catch (err: unknown) {
    // Rethrow if already an H3/Nuxt error (e.g. our createError for bad response)
    const status = (err as { statusCode?: number })?.statusCode
    if (typeof status === 'number' && status >= 400) {
      throw err
    }
    const parsedError = parseOpenAIError(err)
    console.error('[openai/translate-paragraphs] OpenAI request failed', {
      status: parsedError.status,
      message: parsedError.message,
      code: parsedError.code,
      type: parsedError.type,
      model,
    })
    throw createOpenAIError(err, 'Translation')
  }
})
