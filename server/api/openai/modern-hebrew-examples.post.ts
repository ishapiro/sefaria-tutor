import { createError, defineEventHandler, readBody } from 'h3'
import { useRuntimeConfig } from 'nitropack/runtime/internal/config'
import { $fetch } from 'ofetch'
import { validateAuth } from '~/server/utils/auth'
import { getDefaultTranslationModel } from '~/server/utils/system-settings'

const MODERN_HEBREW_EXAMPLES_INSTRUCTIONS = `You are a modern Hebrew teacher. You will be given a single Hebrew word and its English translation (from Biblical or liturgical context).

Your task: Provide exactly 3 short example sentences in modern Hebrew that use this word (or its modern equivalent) naturally. Each example must:
1. Be a complete, natural modern Hebrew sentence (everyday usage, not Biblical).
2. Use the word in a way that would be understood by a contemporary Hebrew speaker.
3. Be written in Hebrew with full vowel pointing (nikud/niqqud).

IMPORTANT — Biblical vs. modern forms: If the given word is a Biblical Hebrew form (e.g. archaic conjugation, construct state, or spelling that differs from modern usage), do NOT use the Biblical form in your example sentences. Instead, use the modern Hebrew form based on the same root (שורש). For example, if given a Biblical verb form, use the corresponding modern Hebrew verb form; if given a Biblical noun, use the modern Hebrew noun from that root. Your examples must always use natural, contemporary Hebrew.

If you cannot provide useful examples—for example because the word is a proper name (person or place), or the root has no common modern usage—then do NOT provide examples. Instead, explain briefly in English why you cannot (e.g. "This word is a proper name (a person's name); modern Hebrew example sentences are not applicable." or "This word is primarily used in Biblical context and is rarely used in everyday modern Hebrew.").

Reply with a JSON object only, no other text. Use one of these two shapes:

When you CAN provide examples:
{"examples":[{"sentence":"...","translation":"..."},{"sentence":"...","translation":"..."},{"sentence":"...","translation":"..."}]}

When you CANNOT provide examples (e.g. proper name, or no modern usage):
{"explanation":"Your brief explanation in English."}

Rules:
- "sentence": The modern Hebrew sentence with nikud.
- "translation": The English translation of that sentence.
- Provide exactly 3 examples when possible. Each sentence should be short (one clause or simple sentence).
- If the word is a proper name (person, place, etc.), return only {"explanation":"..."} and explain that it is a proper name.`

/** Extract text from Responses API output */
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

  const body = await readBody<{ word?: string; wordTranslation?: string }>(event)
  const word = body?.word?.trim()
  const wordTranslation = body?.wordTranslation?.trim()
  if (!word) {
    throw createError({
      statusCode: 400,
      statusMessage: 'Bad Request',
      message: 'Missing word in body',
    })
  }

  // @ts-ignore - Cloudflare D1 binding
  const db = event.context.cloudflare?.env?.DB
  const model = await getDefaultTranslationModel(db)

  const input = wordTranslation
    ? `Hebrew word: ${word}\nEnglish translation: ${wordTranslation}`
    : `Hebrew word: ${word}`

  try {
    const response = await $fetch<{
      output?: Array<{ type?: string; content?: Array<{ type?: string; text?: string }> }>
    }>('https://api.openai.com/v1/responses', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${openaiApiKey}`,
      },
      body: {
        model,
        instructions: MODERN_HEBREW_EXAMPLES_INSTRUCTIONS,
        input,
        max_output_tokens: 1024,
        reasoning: { effort: 'medium' as const },
        text: { verbosity: 'medium' as const },
      },
    })

    const raw = extractTextFromResponse(response)
    if (!raw) {
      console.error('[openai/modern-hebrew-examples] Empty or unexpected response shape')
      throw createError({
        statusCode: 502,
        statusMessage: 'Bad Gateway',
        message: 'Modern Hebrew examples failed: empty response from OpenAI',
      })
    }

    const jsonStr = raw.replace(/^[^{]*/, '').replace(/[^}]*$/, '') || raw
    const match = jsonStr.match(/\{[\s\S]*\}/)
    const toParse = match ? match[0] : jsonStr
    let parsed: { examples?: Array<{ sentence: string; translation: string }>; explanation?: string }
    try {
      parsed = JSON.parse(toParse) as { examples?: Array<{ sentence: string; translation: string }>; explanation?: string }
    } catch {
      console.error('[openai/modern-hebrew-examples] Invalid JSON in response', { raw: raw.slice(0, 200) })
      throw createError({
        statusCode: 502,
        statusMessage: 'Bad Gateway',
        message: 'Modern Hebrew examples failed: invalid JSON from OpenAI',
      })
    }

    if (parsed.examples && Array.isArray(parsed.examples)) {
      return { examples: parsed.examples.slice(0, 3), explanation: undefined }
    }
    if (parsed.explanation && typeof parsed.explanation === 'string') {
      return { examples: undefined, explanation: parsed.explanation.trim() }
    }
    throw createError({
      statusCode: 502,
      statusMessage: 'Bad Gateway',
      message: 'Modern Hebrew examples failed: response missing examples or explanation',
    })
  } catch (err: unknown) {
    const status = (err as { statusCode?: number })?.statusCode
    if (typeof status === 'number' && status >= 400) throw err
    const data = (err as { data?: { error?: { message?: string } } })?.data
    const message = data?.error?.message ?? (err instanceof Error ? err.message : 'Modern Hebrew examples request failed')
    console.error('[openai/modern-hebrew-examples] OpenAI request failed', { status, message })
    throw createError({
      statusCode: status && status >= 400 && status < 500 ? status : 502,
      statusMessage: status === 400 ? 'Bad Request' : 'Bad Gateway',
      message: `Modern Hebrew examples failed: ${message}`,
    })
  }
})
