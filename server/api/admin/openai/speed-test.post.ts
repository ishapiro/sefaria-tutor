import { createError, defineEventHandler, readBody } from 'h3'
import { useRuntimeConfig } from 'nitropack/runtime/internal/config'
import { $fetch } from 'ofetch'
import { requireUserRole } from '~/server/utils/auth'

/** Standard translation prompt - must match server/api/openai/chat.post.ts */
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

CRITICAL: The wordTable must contain exactly one entry for every word in originalPhrase. Never stop early; include all words even for long passages.

Special Instructions:
- Prefixes/suffixes (e.g., ה, ו, כ, ל): identify and explain them in the "grammarNotes" field.
- Nouns: Provide masculine/feminine/plural forms.
- Verbs: Include all key conjugations (past/present/future/infinitive). Always provide presentTenseHebrew for verbs (the present tense form in Hebrew, e.g. masculine singular).

Here is an example of correct output:
{"originalPhrase":"הילד אכל תפוח","translatedPhrase":"The boy ate an apple","wordTable":[{"word":"הילד","wordTranslation":"boy","hebrewAramaic":"Hebrew","wordRoot":"י־ל־ד","wordRootTranslation":"bear, give birth","rootExamples":[{"word":"ילדה","translation":"girl"},{"word":"ילוד","translation":"newborn"}],"wordPartOfSpeech":"noun","wordGender":"masculine","wordTense":null,"wordBinyan":null,"presentTenseHebrew":null,"grammarNotes":"The prefix 'ה' is the definite article ('the')."},{"word":"אכל","wordTranslation":"ate","hebrewAramaic":"Hebrew","wordRoot":"א־כ־ל","wordRootTranslation":"eat","rootExamples":[{"word":"אוכל","translation":"food"},{"word":"אכילה","translation":"eating"}],"wordPartOfSpeech":"verb","wordGender":"masculine","wordTense":"past","wordBinyan":"Pa'al","presentTenseHebrew":"אוכל","grammarNotes":"Pa'al binyan, 3rd person masculine singular."},{"word":"תפוח","wordTranslation":"apple","hebrewAramaic":"Hebrew","wordRoot":"ת־פ־ח","wordRootTranslation":"blow, breathe","wordPartOfSpeech":"noun","wordGender":"masculine","wordTense":null,"wordBinyan":null,"presentTenseHebrew":null,"grammarNotes":"Masculine singular noun."}]}
`

/** Typical Hebrew sentence used for speed testing */
const TEST_PROMPT = 'הילד אכל תפוח'

export default defineEventHandler(async (event) => {
  await requireUserRole(event, ['admin'])

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

  const body = await readBody<{ model?: string }>(event)
  const model = body?.model?.trim()
  if (!model) {
    throw createError({
      statusCode: 400,
      statusMessage: 'Bad Request',
      message: 'Missing model in body',
    })
  }

  const start = Date.now()
  try {
    await $fetch('https://api.openai.com/v1/responses', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${openaiApiKey}`,
      },
      body: {
        model,
        instructions: SYSTEM_PROMPT,
        input: TEST_PROMPT,
        max_output_tokens: 4096,
        reasoning: { effort: 'medium' as const },
        text: { verbosity: 'medium' as const },
      },
    })
    const durationMs = Date.now() - start
    return { success: true, model, durationMs }
  } catch (err: unknown) {
    const durationMs = Date.now() - start
    const message = ((err as { data?: { error?: { message?: string } } })?.data?.error?.message ?? (err instanceof Error ? err.message : 'Unknown error')).toString()
    return { success: false, model, durationMs, error: message }
  }
})
