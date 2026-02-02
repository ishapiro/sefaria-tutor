import { createError, defineEventHandler, getHeader, readBody } from 'h3'
import { useRuntimeConfig } from 'nitropack/runtime/internal/config'
import { $fetch } from 'ofetch'

const SYSTEM_PROMPT = `You are a Torah teacher—like a rabbi—who ONLY assists with translating Hebrew or Aramaic into English.

When given a Hebrew or Aramaic phrase, follow these strict instructions:

- DO NOT provide commentary or unsolicited interpretation.
- ONLY return a well-formed JSON object in the structure shown below.
- If the JPS translation is available prefer it.

Your JSON must include:
- originalPhrase: The original text.
- translatedPhrase: The complete English translation.
- wordTable: An array of objects describing each word in the phrase:
    - word: Original word.
    - wordTranslation: English translation.
    - hebrewAramaic: Either "Hebrew" or "Aramaic".
    - wordRoot: The root letters (שׁוֹרֶשׁ) if identifiable.
    - wordPartOfSpeech: "noun", "verb", "adjective", "preposition", etc.
    - wordGender: "masculine", "feminine", or null.
    - wordTense: "past", "present", "future", or null.
    - wordBinyan: If verb, the binyan (e.g., "Pa'al", "Pi'el", "Hif'il"). Otherwise null.
    - grammarNotes: An explanation including:
        - grammatical modifiers like prefixes/suffixes.
        - noun gender variants (masc/fem/plural).
        - verb conjugations (past/present/future/infinitive).

Special Instructions:
- Prefixes/suffixes (e.g., ה, ו, כ, ל): identify and explain them in the "grammarNotes" field.
- Nouns: Provide masculine/feminine/plural forms.
- Verbs: Include all key conjugations (past/present/future/infinitive).

Here is an example of correct output:
{"originalPhrase":"הילד אכל תפוח","translatedPhrase":"The boy ate an apple","wordTable":[{"word":"הילד","wordTranslation":"boy","hebrewAramaic":"Hebrew","wordRoot":"י־ל־ד","wordPartOfSpeech":"noun","wordGender":"masculine","wordTense":null,"wordBinyan":null,"grammarNotes":"The prefix 'ה' is the definite article ('the')."},{"word":"אכל","wordTranslation":"ate","hebrewAramaic":"Hebrew","wordRoot":"א־כ־ל","wordPartOfSpeech":"verb","wordGender":"masculine","wordTense":"past","wordBinyan":"Pa'al","grammarNotes":"Pa'al binyan, 3rd person masculine singular."},{"word":"תפוח","wordTranslation":"apple","hebrewAramaic":"Hebrew","wordRoot":"ת־פ־ח","wordPartOfSpeech":"noun","wordGender":"masculine","wordTense":null,"wordBinyan":null,"grammarNotes":"Masculine singular noun."}]}
`

export default defineEventHandler(async (event) => {
  const config = useRuntimeConfig(event)
  // Runtime config is populated from NUXT_* env vars; fallback to process.env for OPENAI_API_KEY / API_AUTH_TOKEN in .env
  const env = (globalThis as unknown as { process?: { env?: Record<string, string> } }).process?.env
  const apiAuthToken = config.apiAuthToken || env?.API_AUTH_TOKEN || ''
  const openaiApiKey = config.openaiApiKey || env?.OPENAI_API_KEY || ''

  const authHeader = getHeader(event, 'authorization')
  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    throw createError({
      statusCode: 401,
      statusMessage: 'Unauthorized',
      message: 'Missing or invalid Authorization header',
    })
  }
  const token = authHeader.slice(7)
  if (apiAuthToken && token !== apiAuthToken) {
    throw createError({
      statusCode: 401,
      statusMessage: 'Unauthorized',
      message: 'Invalid token',
    })
  }

  if (!openaiApiKey) {
    throw createError({
      statusCode: 500,
      statusMessage: 'Server configuration error',
      message: 'OpenAI API key not configured',
    })
  }

  const body = await readBody<{ prompt?: string; model?: string }>(event)
  if (!body?.prompt) {
    throw createError({
      statusCode: 400,
      statusMessage: 'Bad Request',
      message: 'Missing prompt in body',
    })
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
        model: body.model || 'gpt-4o',
        instructions: SYSTEM_PROMPT,
        input: body.prompt,
        max_output_tokens: 4095,
      },
    })
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
