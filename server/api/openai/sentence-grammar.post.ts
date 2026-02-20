import { createError, defineEventHandler, readBody } from 'h3'
import { useRuntimeConfig } from 'nitropack/runtime/internal/config'
import { $fetch } from 'ofetch'
import { validateAuth } from '~/server/utils/auth'
import { getDefaultTranslationModel } from '~/server/utils/system-settings'

const SENTENCE_GRAMMAR_INSTRUCTIONS = `You are a Hebrew and Aramaic grammar expert. You will be given a phrase or sentence in Hebrew or Aramaic (and optionally its English translation).

Write your explanation so it is clear and accessible to a 6th grader in a Jewish day school. Use simple, everyday English. Whenever you use a grammatical or technical term—such as "narrative clause," "construct chain," "definite article," "binyan," or "subject-verb agreement"—explain in one short phrase what it means right when you first use it (e.g. "a narrative clause—a part of the sentence that tells what happened"). They have some Hebrew background but are still learning.

Reply with a brief explanation of:
1. The overall sentence structure (e.g. who does what, how the main parts fit together).
2. Key grammar points: how the words relate, notable prefixes or suffixes, and important features (e.g. the "the" prefix, two words linked in a construct, verb tense and binyan if relevant).
3. If a word appears more than once in the phrase, explain why Biblical Hebrew often repeats words and what it can mean—for example, emphasis or intensity ("really X"), distributive sense ("each one," "one by one"), or a stylistic way of highlighting that word. Use simple language and explain any term you use.

Use Hebrew script for all Hebrew words and grammatical terminology: write binyan names in Hebrew (e.g. פָּעַל, נִפְעַל, הִפְעִיל), grammatical terms in Hebrew (e.g. סמיכות, מוספית, שורש), and any Hebrew words you cite—do not transliterate. Keep your answer to a few short paragraphs. Do not repeat the phrase or translation in full; refer to "the phrase" or "the sentence." Use markdown for formatting: **bold** for important terms or Hebrew words you introduce, and *italic* only if needed for emphasis.`

/** Extract text from Responses API output; same shape as chat.post.ts / index.vue extractOutputText */
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

  const body = await readBody<{ phrase?: string; translatedPhrase?: string }>(event)
  const phrase = body?.phrase?.trim()
  if (!phrase) {
    throw createError({
      statusCode: 400,
      statusMessage: 'Bad Request',
      message: 'Missing phrase in body',
    })
  }

  // @ts-ignore - Cloudflare D1 binding
  const db = event.context.cloudflare?.env?.DB
  const model = await getDefaultTranslationModel(db)

  const translatedPhrase = body?.translatedPhrase?.trim()
  const input = translatedPhrase
    ? `Hebrew/Aramaic phrase: ${phrase}\n\nEnglish translation: ${translatedPhrase}`
    : phrase

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
        instructions: SENTENCE_GRAMMAR_INSTRUCTIONS,
        input,
        max_output_tokens: 1024,
        reasoning: { effort: 'medium' as const },
        text: { verbosity: 'medium' as const },
      },
    })

    const explanation = extractTextFromResponse(response)
    if (!explanation) {
      console.error('[openai/sentence-grammar] Empty or unexpected response shape', {
        hasOutput: !!response?.output,
        outputLength: response?.output?.length ?? 0,
        firstItemType: response?.output?.[0]?.type,
      })
      throw createError({
        statusCode: 502,
        statusMessage: 'Bad Gateway',
        message: 'Grammar explanation failed: empty or unexpected response from OpenAI',
      })
    }
    return { explanation }
  } catch (err: unknown) {
    // Rethrow if already an H3/Nuxt error (e.g. our createError for empty response)
    const status = (err as { statusCode?: number })?.statusCode
    if (typeof status === 'number' && status >= 400) {
      throw err
    }
    const data = (err as { data?: { error?: { message?: string } } })?.data
    const message = data?.error?.message ?? (err instanceof Error ? err.message : 'Sentence grammar request failed')
    console.error('[openai/sentence-grammar] OpenAI request failed', { status, message })
    throw createError({
      statusCode: status && status >= 400 && status < 500 ? status : 502,
      statusMessage: status === 400 ? 'Bad Request' : 'Bad Gateway',
      message: `Grammar explanation failed: ${message}`,
    })
  }
})
