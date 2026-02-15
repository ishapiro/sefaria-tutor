import { createError, defineEventHandler, getQuery } from 'h3'
import { useRuntimeConfig } from 'nitropack/runtime/internal/config'
import { $fetch } from 'ofetch'
import { normalizeRootForSearch, toDisplayRoot } from '~/server/utils/rootNormalize'

const ROOT_MEANING_INSTRUCTIONS = `You are a Hebrew language expert. Given a Hebrew root (shoresh), reply with ONLY a brief English meaning: one short phrase (e.g. "holy, sanctify" or "say, speak"). No explanation, no punctuation at the end, no quotes.`

function extractTextFromOpenAIResponse (response: {
  output?: Array<{ content?: Array<{ type?: string; text?: string }> }>
}): string {
  const output = response.output?.[0]
  const content = output?.content?.find((c: { type?: string }) => c.type === 'output_text') as { text?: string } | undefined
  return (content?.text ?? '').trim()
}

export default defineEventHandler(async (event): Promise<{ meaning: string } | { error: string }> => {
  const query = getQuery(event)
  let rootParam = query.root as string | undefined
  if (rootParam != null && typeof rootParam === 'string' && rootParam.includes('%')) {
    try {
      rootParam = decodeURIComponent(rootParam)
    } catch {
      // leave as-is
    }
  }

  const normalized = normalizeRootForSearch(rootParam)
  if (!normalized) {
    throw createError({
      statusCode: 400,
      statusMessage: 'Invalid or missing root',
      data: { error: 'Please provide a valid Hebrew root or word.' },
    })
  }

  const config = useRuntimeConfig(event)
  const env = (globalThis as unknown as { process?: { env?: Record<string, string> } }).process?.env
  const openaiApiKey = config.openaiApiKey || env?.OPENAI_API_KEY || ''

  // @ts-ignore - Cloudflare D1 binding
  const db = event.context.cloudflare?.env?.DB

  if (db) {
    try {
      const row = (await db.prepare('SELECT meaning FROM root_translation_cache WHERE root_normalized = ?')
        .bind(normalized)
        .first()) as { meaning: string } | null

      if (row?.meaning) {
        return { meaning: row.meaning }
      }
    } catch (e) {
      const msg = e instanceof Error ? e.message : String(e)
      if (msg.includes('no such table') || msg.includes('root_translation_cache')) {
        console.warn('[root-explorer/meaning] Cache table missing (run migration 0014_root_translation_cache.sql for local D1)')
      } else {
        console.error('[root-explorer/meaning] Cache read error:', e)
      }
    }
  }

  if (!openaiApiKey) {
    return { meaning: '' }
  }

  try {
    interface OpenAIOutputItem {
      content?: Array<{ type?: string; text?: string }>
    }
    const response = await $fetch<{ output?: OpenAIOutputItem[] }>('https://api.openai.com/v1/responses', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${openaiApiKey}`,
      },
      body: {
        model: 'gpt-5.1',
        instructions: ROOT_MEANING_INSTRUCTIONS,
        input: `Hebrew root: ${toDisplayRoot(normalized)} (${normalized})`,
        max_output_tokens: 60,
        reasoning: { effort: 'none' },
        text: { verbosity: 'low' },
      },
    })

    const raw = extractTextFromOpenAIResponse(response)
    const meaning = raw.replace(/^["']|["']$/g, '').trim() || raw.trim()

    if (db && meaning) {
      try {
        const now = Math.floor(Date.now() / 1000)
        await db.prepare('INSERT OR REPLACE INTO root_translation_cache (root_normalized, meaning, created_at) VALUES (?, ?, ?)')
          .bind(normalized, meaning, now)
          .run()
      } catch (e) {
        console.error('[root-explorer/meaning] Cache write error:', e)
      }
    }

    return { meaning }
  } catch (err: unknown) {
    const data = (err as { data?: { error?: { message?: string } } })?.data
    const message = data?.error?.message ?? (err instanceof Error ? err.message : 'Failed to get root meaning')
    console.error('[root-explorer/meaning] OpenAI error:', err)
    // Return empty meaning so the concordance page still works; avoid 502
    return { meaning: '' }
  }
})
