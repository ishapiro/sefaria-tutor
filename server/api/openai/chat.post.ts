import { createError, defineEventHandler, getHeader, readBody } from 'h3'
import { useRuntimeConfig } from 'nitropack/runtime/internal/config'
import { $fetch } from 'ofetch'
import { normalizePhrase, computePhraseHash, computeHash, CURRENT_CACHE_VERSION, CACHE_TTL_SECONDS, isValidTranslationStructure } from '~/server/utils/cache'
import { validateAuth } from '~/server/utils/auth'

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
    - wordPartOfSpeech: "noun", "verb", "adjective", "preposition", etc.
    - wordGender: "masculine", "feminine", or null.
    - wordTense: "past", "present", "future", or null.
    - wordBinyan: If verb, the binyan (e.g., "Pa'al", "Pi'el", "Hif'il"). Otherwise null.
    - presentTenseHebrew: If the word is a verb, the present tense form in Hebrew (e.g. masculine singular). Otherwise null.
    - grammarNotes: An explanation including:
        - grammatical modifiers like prefixes/suffixes.
        - noun gender variants (masc/fem/plural).
        - verb conjugations (past/present/future/infinitive).

CRITICAL: The wordTable must contain exactly one entry for every word in originalPhrase. Never stop early; include all words even for long passages.

Special Instructions:
- Prefixes/suffixes (e.g., ה, ו, כ, ל): identify and explain them in the "grammarNotes" field.
- Nouns: Provide masculine/feminine/plural forms.
- Verbs: Include all key conjugations (past/present/future/infinitive). Always provide presentTenseHebrew for verbs (the present tense form in Hebrew, e.g. masculine singular).

Here is an example of correct output:
{"originalPhrase":"הילד אכל תפוח","translatedPhrase":"The boy ate an apple","wordTable":[{"word":"הילד","wordTranslation":"boy","hebrewAramaic":"Hebrew","wordRoot":"י־ל־ד","wordPartOfSpeech":"noun","wordGender":"masculine","wordTense":null,"wordBinyan":null,"presentTenseHebrew":null,"grammarNotes":"The prefix 'ה' is the definite article ('the')."},{"word":"אכל","wordTranslation":"ate","hebrewAramaic":"Hebrew","wordRoot":"א־כ־ל","wordPartOfSpeech":"verb","wordGender":"masculine","wordTense":"past","wordBinyan":"Pa'al","presentTenseHebrew":"אוכל","grammarNotes":"Pa'al binyan, 3rd person masculine singular."},{"word":"תפוח","wordTranslation":"apple","hebrewAramaic":"Hebrew","wordRoot":"ת־פ־ח","wordPartOfSpeech":"noun","wordGender":"masculine","wordTense":null,"wordBinyan":null,"presentTenseHebrew":null,"grammarNotes":"Masculine singular noun."}]}
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

  if (db) {
    try {
      const now = Math.floor(Date.now() / 1000)
      const cached = await db.prepare('SELECT response, phrase, created_at, version, prompt_hash FROM translation_cache WHERE phrase_hash = ?')
        .bind(hash)
        .first<{ response: string; phrase: string; created_at: number; version: number; prompt_hash: string }>()

      if (cached && 
          cached.phrase === normalized && 
          cached.version === CURRENT_CACHE_VERSION &&
          (now - cached.created_at) < CACHE_TTL_SECONDS) {
        
        let parsed: any = null
        try {
          parsed = JSON.parse(cached.response)
        } catch (e) {
          parsed = null
        }

        if (parsed && isValidTranslationStructure(parsed)) {
          // Cache Hit - Structurally compatible and within TTL
          await db.prepare('UPDATE cache_stats SET hits = hits + 1, updated_at = ? WHERE id = 1')
            .bind(now)
            .run()
          
          return parsed
        } else {
          // Malformed Hit - Treat as miss and track it
          await db.prepare('UPDATE cache_stats SET malformed_hits = malformed_hits + 1, updated_at = ? WHERE id = 1')
            .bind(now)
            .run()
          // Proceed to fetch fresh from OpenAI
        }
      }
    } catch (dbErr) {
      console.error('Cache read error:', dbErr)
      // Continue to OpenAI on cache error
    }
  }

  try {
    const response = await $fetch<{
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
        model: body.model || 'gpt-5.1',
        instructions: SYSTEM_PROMPT,
        input: body.prompt,
        max_output_tokens: body.fullSentence ? 20000 : 4096,
        reasoning: { effort: 'none' },
        text: { verbosity: 'low' },
      },
    })

    if (db) {
      try {
        const now = Math.floor(Date.now() / 1000)
        // Cache Miss - Save to cache
        await db.prepare('INSERT OR REPLACE INTO translation_cache (phrase_hash, phrase, response, created_at, version, prompt_hash) VALUES (?, ?, ?, ?, ?, ?)')
          .bind(hash, normalized, JSON.stringify(response), now, CURRENT_CACHE_VERSION, promptHash)
          .run()
        
        await db.prepare('UPDATE cache_stats SET misses = misses + 1, updated_at = ? WHERE id = 1')
          .bind(now)
          .run()
      } catch (dbWriteErr) {
        console.error('Cache write error:', dbWriteErr)
      }
    }

    return response
  } catch (err: unknown) {
    const status = (err as { statusCode?: number })?.statusCode ?? 500
    const data = (err as { data?: { error?: { message?: string } } })?.data
    const message = data?.error?.message ?? (err instanceof Error ? err.message : 'OpenAI request failed')
    throw createError({
      statusCode: status >= 400 && status < 500 ? status : 502,
      statusMessage: status === 400 ? 'Bad Request' : 'Bad Gateway',
      message,
    })
  }
})
