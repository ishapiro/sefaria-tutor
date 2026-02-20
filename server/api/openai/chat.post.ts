import { createError, defineEventHandler, readBody } from 'h3'
import { useRuntimeConfig } from 'nitropack/runtime/internal/config'
import { $fetch } from 'ofetch'
import { normalizePhrase, computePhraseHash, computeHash, CURRENT_CACHE_VERSION, CACHE_TTL_SECONDS, isValidTranslationStructure } from '~/server/utils/cache'
import { validateAuth } from '~/server/utils/auth'
import { getTranslationFallbackModel } from '~/server/utils/openai-models'
import { getDefaultTranslationModel } from '~/server/utils/system-settings'

/**
 * ATTENTION: If you modify the JSON structure (fields) in the SYSTEM_PROMPT below,
 * you MUST increment CURRENT_CACHE_VERSION in server/utils/cache.ts to 
 * invalidate the existing cache and prevent structural mismatches.
 */
const SYSTEM_PROMPT = `You are a Torah teacher—like a rabbi—who ONLY assists with translating Hebrew or Aramaic into English.

When given a Hebrew or Aramaic phrase, follow these strict instructions:

- DO NOT provide commentary or unsolicited interpretation.
- ONLY return a well-formed JSON object in the structure shown below.
- If the JPS translation is available prefer it.

Your JSON must include:
- originalPhrase: The original text.
- translatedPhrase: The complete English translation.
- wordTable: An array of objects describing EACH AND EVERY word in the phrase, in order. CRITICAL: Do NOT truncate. The array must have one entry per word—for long texts, continue until every word is covered.
    - word: Original word.
    - wordTranslation: English translation.
    - hebrewAramaic: Either "Hebrew" or "Aramaic".
    - wordRoot: The root letters (שׁוֹרֶשׁ) if identifiable.
    - wordRootTranslation: A brief English translation of the root meaning (e.g., "say", "create", "bless"). Include this whenever wordRoot is provided.
    - rootExamples: An optional array of additional examples of words with the same root. Each example should be an object with:
        - word: The Hebrew/Aramaic word.
        - translation: A brief English translation (1-3 words).
      Include this field only when wordRoot is provided and there are other common words sharing the same root. Limit to 3-5 examples.
    - wordPartOfSpeech: "noun", "verb", "adjective", "preposition", etc.
    - wordGender: "masculine", "feminine", or null.
    - wordTense: "past", "present", "future", or null.
    - wordBinyan: If verb, the binyan (e.g., "Pa'al", "Pi'el", "Hif'il"). Otherwise null.
    - presentTenseHebrew: If the word is a verb, the present tense form in Hebrew (e.g. masculine singular). Otherwise null.
    - grammarNotes: An explanation including:
        - grammatical modifiers like prefixes/suffixes.
        - noun gender variants (masc/fem/plural).
        - verb conjugations (past/present/future/infinitive).
    - modernHebrewExample: Optional. For Hebrew words only, you may include a short example of the word used in a modern Hebrew sentence, as an object with:
        - sentence: A short modern Hebrew sentence (one short phrase or clause) that uses this word naturally. Write the Hebrew with full vowel pointing (nikud/niqqud).
        - translation: The English translation of that sentence.
      Keep the example short (one brief phrase or simple sentence). Omit for Aramaic words or when a natural short example is not available.

CRITICAL: The wordTable must contain exactly one entry for every word in originalPhrase. Never stop early; include all words even for long passages.

Special Instructions:
- Prefixes/suffixes (e.g., ה, ו, כ, ל): identify and explain them in the "grammarNotes" field.
- Nouns: Provide masculine/feminine/plural forms.
- Verbs: Include all key conjugations (past/present/future/infinitive). Always provide presentTenseHebrew for verbs (the present tense form in Hebrew, e.g. masculine singular).

Here is an example of correct output (modernHebrewExample is optional and may be omitted):
{"originalPhrase":"הילד אכל תפוח","translatedPhrase":"The boy ate an apple","wordTable":[{"word":"הילד","wordTranslation":"boy","hebrewAramaic":"Hebrew","wordRoot":"י־ל־ד","wordRootTranslation":"bear, give birth","rootExamples":[{"word":"ילדה","translation":"girl"},{"word":"ילוד","translation":"newborn"}],"wordPartOfSpeech":"noun","wordGender":"masculine","wordTense":null,"wordBinyan":null,"presentTenseHebrew":null,"grammarNotes":"The prefix 'ה' is the definite article ('the').","modernHebrewExample":{"sentence":"הַיֶּלֶד הָלַךְ לְבֵית הַסֵּפֶר","translation":"The boy went to school."}},{"word":"אכל","wordTranslation":"ate","hebrewAramaic":"Hebrew","wordRoot":"א־כ־ל","wordRootTranslation":"eat","rootExamples":[{"word":"אוכל","translation":"food"},{"word":"אכילה","translation":"eating"}],"wordPartOfSpeech":"verb","wordGender":"masculine","wordTense":"past","wordBinyan":"Pa'al","presentTenseHebrew":"אוכל","grammarNotes":"Pa'al binyan, 3rd person masculine singular.","modernHebrewExample":{"sentence":"אֲנַחְנוּ אוֹכְלִים אֲרוּחַת עֶרֶב","translation":"We eat dinner."}},{"word":"תפוח","wordTranslation":"apple","hebrewAramaic":"Hebrew","wordRoot":"ת־פ־ח","wordRootTranslation":"blow, breathe","wordPartOfSpeech":"noun","wordGender":"masculine","wordTense":null,"wordBinyan":null,"presentTenseHebrew":null,"grammarNotes":"Masculine singular noun."}]}
`

export default defineEventHandler(async (event) => {
  validateAuth(event)
  const config = useRuntimeConfig(event)
  // Runtime config is populated from NUXT_* env vars; fallback to process.env for OPENAI_API_KEY / API_AUTH_TOKEN in .env
  const env = (globalThis as unknown as { process?: { env?: Record<string, string> } }).process?.env
  const openaiApiKey = config.openaiApiKey || env?.OPENAI_API_KEY || ''

  if (!openaiApiKey) {
    throw createError({
      statusCode: 500,
      statusMessage: 'Server configuration error',
      message: 'OpenAI API key not configured',
    })
  }

  const body = await readBody<{ prompt?: string; model?: string; fullSentence?: boolean }>(event)
  if (!body?.prompt) {
    throw createError({
      statusCode: 400,
      statusMessage: 'Bad Request',
      message: 'Missing prompt in body',
    })
  }

  const normalized = normalizePhrase(body.prompt)
  const hash = await computePhraseHash(normalized)
  const promptHash = await computeHash(SYSTEM_PROMPT)

  // @ts-ignore
  const db = event.context.cloudflare?.env?.DB
  const primaryModel = await getDefaultTranslationModel(db)

  if (db) {
    try {
      const now = Math.floor(Date.now() / 1000)
      const cached = (await db.prepare('SELECT response, phrase, created_at, version, prompt_hash FROM translation_cache WHERE phrase_hash = ?')
        .bind(hash)
        .first()) as {
        response: string
        phrase: string
        created_at: number
        version: number
        prompt_hash: string
      } | null

      if (cached &&
          cached.phrase === normalized &&
          cached.version === CURRENT_CACHE_VERSION &&
          (now - cached.created_at) < CACHE_TTL_SECONDS) {
        console.log('[openai/chat][cache] HIT', {
          phrasePreview: normalized.slice(0, 80),
          phraseLength: normalized.length,
          createdAt: cached.created_at,
          ageSeconds: now - cached.created_at,
          version: cached.version,
        })
        try {
          const parsed = JSON.parse(cached.response)
          // Trust the cached payload as long as it is valid JSON; the client
          // already performs its own parsing/validation of the inner JSON and
          // will surface any structural problems.
          await db.prepare('UPDATE cache_stats SET hits = hits + 1, updated_at = ? WHERE id = 1')
            .bind(now)
            .run()
          return { ...parsed, fromCache: true }
        } catch (e) {
          console.warn('[openai/chat][cache] Failed to parse cached.response JSON – treating as miss', {
            phrasePreview: normalized.slice(0, 80),
            error: (e as Error).message,
          })
          // fall through to OpenAI call on parse failure
        }
      }
    } catch (dbErr) {
      console.error('Cache read error:', dbErr)
      // Continue to OpenAI on cache error
    }
  }

  async function callOpenAI (model: string) {
    console.log('[openai/chat] Calling OpenAI with model:', model, 'promptLength:', body.prompt?.length ?? 0)
    return $fetch<{
      id: string
      object: string
      created_at: number
      status: string
      model: string
      output: Array<{
        type: string
        content?: Array<{ type: string; text?: string }>
      }>
      usage?: { input_tokens: number; output_tokens: number; total_tokens: number }
    }>('https://api.openai.com/v1/responses', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${openaiApiKey}`,
      },
      body: {
        model,
        instructions: SYSTEM_PROMPT,
        input: body.prompt,
        max_output_tokens: body.fullSentence ? 20000 : 4096,
        reasoning: { effort: 'medium' as const }, // gpt-5.2-chat-latest requires 'medium'; 'none' not supported
        text: { verbosity: 'medium' as const }, // gpt-5.2-chat-latest requires 'medium'
        // temperature not supported by gpt-5.2-chat-latest
      },
    })
  }

  function isModelError (err: unknown): boolean {
    const status = (err as { statusCode?: number })?.statusCode
    const message = ((err as { data?: { error?: { message?: string } } })?.data?.error?.message ?? (err instanceof Error ? err.message : '')).toLowerCase()
    if (status === 404) return true
    if (message.includes('model') && (message.includes('not found') || message.includes('does not exist') || message.includes('invalid'))) return true
    return false
  }

  try {
    let response = await callOpenAI(primaryModel)
    if (db) {
      try {
        const now = Math.floor(Date.now() / 1000)
        await db.prepare('INSERT OR REPLACE INTO translation_cache (phrase_hash, phrase, response, created_at, version, prompt_hash) VALUES (?, ?, ?, ?, ?, ?)')
          .bind(hash, normalized, JSON.stringify(response), now, CURRENT_CACHE_VERSION, promptHash)
          .run()
        await db.prepare('UPDATE cache_stats SET misses = misses + 1, updated_at = ? WHERE id = 1')
          .bind(now)
          .run()
        console.log('[openai/chat][cache] MISS – stored response', {
          phrasePreview: normalized.slice(0, 80),
          phraseLength: normalized.length,
          version: CURRENT_CACHE_VERSION,
        })
      } catch (dbWriteErr) {
        console.error('Cache write error:', dbWriteErr)
      }
    }
    return response
  } catch (err: unknown) {
    console.error('[openai/chat] Primary model failed:', {
      model: primaryModel,
      status: (err as { statusCode?: number })?.statusCode,
      message: ((err as { data?: { error?: { message?: string } } })?.data?.error?.message ?? (err instanceof Error ? err.message : '')),
    })
    if (isModelError(err)) {
      try {
        const fallbackModel = await getTranslationFallbackModel(openaiApiKey, primaryModel)
        console.log('[openai/chat] Retrying with fallback model:', fallbackModel)
        const response = await callOpenAI(fallbackModel)
        if (db) {
          try {
            const now = Math.floor(Date.now() / 1000)
            await db.prepare('INSERT OR REPLACE INTO translation_cache (phrase_hash, phrase, response, created_at, version, prompt_hash) VALUES (?, ?, ?, ?, ?, ?)')
              .bind(hash, normalized, JSON.stringify(response), now, CURRENT_CACHE_VERSION, promptHash)
              .run()
            await db.prepare('UPDATE cache_stats SET misses = misses + 1, updated_at = ? WHERE id = 1')
              .bind(now)
              .run()
            console.log('[openai/chat][cache] MISS_FALLBACK – stored response', {
              phrasePreview: normalized.slice(0, 80),
              phraseLength: normalized.length,
              version: CURRENT_CACHE_VERSION,
            })
          } catch (dbWriteErr) {
            console.error('Cache write error:', dbWriteErr)
          }
        }
        return response
      } catch (fallbackErr) {
        // Fallback failed; rethrow original error
      }
    }
    const status = (err as { statusCode?: number })?.statusCode ?? 500
    const data = (err as { data?: { error?: { message?: string; code?: string; type?: string } } })?.data
    const errorDetail = data?.error
    const message = errorDetail?.message ?? (err instanceof Error ? err.message : 'OpenAI request failed')

    // Debug: log full error for diagnosis
    console.error('[openai/chat] OpenAI request failed:', {
      status,
      model: primaryModel,
      promptLength: body.prompt?.length ?? 0,
      openaiError: errorDetail ? { message: errorDetail.message, code: errorDetail.code, type: errorDetail.type } : null,
      fullErrorData: data,
    })

    throw createError({
      statusCode: status >= 400 && status < 500 ? status : 502,
      statusMessage: status === 400 ? 'Bad Request' : 'Bad Gateway',
      message: `Translation failed: ${message}`,
    })
  }
})
