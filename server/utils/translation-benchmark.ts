import { $fetch } from 'ofetch'
import { getCachedEffort, markEffortUnsupported, isUnsupportedEffortError, estimateMaxOutputTokens } from '~/server/utils/openai-reasoning'
import { saveMsPerWord, saveGrammarMs } from '~/server/utils/system-settings'

/** Canonical test sentence — same one shown in the admin speed-test UI. */
export const BENCHMARK_PROMPT = 'וַיֹּ֧אמֶר אֵלָ֛יו יְהֹוָ֖ה (מזה) [מַה־זֶּ֣ה] בְיָדֶ֑ךָ וַיֹּ֖אמֶר מַטֶּֽה׃'

export const BENCHMARK_WORD_COUNT = BENCHMARK_PROMPT.trim().split(/\s+/).filter(Boolean).length

/** Must stay in sync with server/api/openai/chat.post.ts SYSTEM_PROMPT */
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

export interface BenchmarkResult {
  success: boolean
  model: string
  durationMs: number
  msPerWord: number
  error?: string
}

/**
 * Runs a translation speed benchmark for `model`, stores the ms-per-word result in
 * the D1 database, and returns the result.
 *
 * Safe to call without awaiting — failures are logged but never thrown.
 */
export async function runTranslationBenchmark (
  model: string,
  openaiApiKey: string,
  db: unknown,
): Promise<BenchmarkResult> {
  const maxOutputTokens = estimateMaxOutputTokens(BENCHMARK_PROMPT, true)

  async function callWithEffort (effort: string) {
    return $fetch('https://api.openai.com/v1/responses', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${openaiApiKey}` },
      body: {
        model,
        instructions: SYSTEM_PROMPT,
        input: BENCHMARK_PROMPT,
        max_output_tokens: maxOutputTokens,
        reasoning: { effort },
        text: { verbosity: 'medium' as const },
      },
    })
  }

  const start = Date.now()
  try {
    let effort = getCachedEffort(model)
    try {
      await callWithEffort(effort)
    } catch (err) {
      if (isUnsupportedEffortError(err)) {
        markEffortUnsupported(model, effort)
        effort = getCachedEffort(model)
        await callWithEffort(effort)
      } else {
        throw err
      }
    }
    const durationMs = Date.now() - start
    const msPerWord = durationMs / BENCHMARK_WORD_COUNT

    try {
      await saveMsPerWord(db as any, msPerWord)
      console.log(`[benchmark] Stored ms_per_word=${Math.round(msPerWord)} for model=${model}`)
    } catch (dbErr) {
      console.error('[benchmark] Failed to store ms_per_word:', dbErr)
    }

    return { success: true, model, durationMs, msPerWord }
  } catch (err: unknown) {
    const durationMs = Date.now() - start
    const message = ((err as { data?: { error?: { message?: string } } })?.data?.error?.message ?? (err instanceof Error ? err.message : 'Unknown error')).toString()
    console.error(`[benchmark] Failed for model=${model}:`, message)
    return { success: false, model, durationMs, msPerWord: 0, error: message }
  }
}

const GRAMMAR_BENCHMARK_PROMPT = 'וַיֹּ֥אמֶר יְהוֹשֻׁ֖עַ אֶל־בְּנֵ֣י יִשְׂרָאֵ֑ל עַד־אָ֙נָה֙ אַתֶּ֣ם מִתְרַפִּ֔ים לָבוֹא֙ לָרֶ֣שֶׁת אֶת־הָאָ֔רֶץ אֲשֶׁר֙ נָתַ֣ן לָכֶ֔ם יְהֹוָ֖ה אֱלֹהֵ֥י אֲבוֹתֵיכֶֽם׃'

const GRAMMAR_INSTRUCTIONS = `You are a Hebrew and Aramaic grammar expert. You will be given a phrase or sentence in Hebrew or Aramaic (and optionally its English translation).

Write your explanation so it is clear and accessible to a 6th grader in a Jewish day school. Use simple, everyday English. Whenever you use a grammatical or technical term—such as "narrative clause," "construct chain," "definite article," "binyan," or "subject-verb agreement"—explain in one short phrase what it means right when you first use it (e.g. "a narrative clause—a part of the sentence that tells what happened"). They have some Hebrew background but are still learning.

Reply with a brief explanation of:
1. The overall sentence structure (e.g. who does what, how the main parts fit together).
2. Key grammar points: how the words relate, notable prefixes or suffixes, and important features (e.g. the "the" prefix, two words linked in a construct, verb tense and binyan if relevant).
3. If a word appears more than once in the phrase, explain why Biblical Hebrew often repeats words and what it can mean—for example, emphasis or intensity ("really X"), distributive sense ("each one," "one by one"), or a stylistic way of highlighting that word. Use simple language and explain any term you use.

Use Hebrew script for all Hebrew words and grammatical terminology: write binyan names in Hebrew (e.g. פָּעַל, נִפְעַל, הִפְעִיל), grammatical terms in Hebrew (e.g. סמיכות, מוספית, שורש), and any Hebrew words you cite—do not transliterate. Keep your answer to a few short paragraphs. Do not repeat the phrase or translation in full; refer to "the phrase" or "the sentence." Use markdown for formatting: **bold** for important terms or Hebrew words you introduce, and *italic* only if needed for emphasis.`

/**
 * Runs a grammar explanation benchmark for `model`, stores the total-ms result, and returns it.
 * Safe to call without awaiting.
 */
export async function runGrammarBenchmark (
  model: string,
  openaiApiKey: string,
  db: unknown,
): Promise<{ success: boolean; model: string; durationMs: number; error?: string }> {
  const input = `Hebrew/Aramaic phrase: ${GRAMMAR_BENCHMARK_PROMPT}`

  async function callWithEffort (effort: string) {
    return $fetch('https://api.openai.com/v1/responses', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${openaiApiKey}` },
      body: {
        model,
        instructions: GRAMMAR_INSTRUCTIONS,
        input,
        max_output_tokens: 1024,
        reasoning: { effort },
        text: { verbosity: 'medium' as const },
      },
    })
  }

  const start = Date.now()
  try {
    let effort = getCachedEffort(model)
    try {
      await callWithEffort(effort)
    } catch (err) {
      if (isUnsupportedEffortError(err)) {
        markEffortUnsupported(model, effort)
        effort = getCachedEffort(model)
        await callWithEffort(effort)
      } else {
        throw err
      }
    }
    const durationMs = Date.now() - start

    try {
      await saveGrammarMs(db as any, durationMs)
      console.log(`[benchmark] Stored grammar_ms=${durationMs} for model=${model}`)
    } catch (dbErr) {
      console.error('[benchmark] Failed to store grammar_ms:', dbErr)
    }

    return { success: true, model, durationMs }
  } catch (err: unknown) {
    const durationMs = Date.now() - start
    const message = ((err as { data?: { error?: { message?: string } } })?.data?.error?.message ?? (err instanceof Error ? err.message : 'Unknown error')).toString()
    console.error(`[benchmark] Grammar benchmark failed for model=${model}:`, message)
    return { success: false, model, durationMs, error: message }
  }
}
