import { $fetch } from 'ofetch'

/** Primary model for translation: fast, no thinking, optimized for scripture. */
export const TRANSLATION_PRIMARY_MODEL = 'gpt-5.1-chat-latest'

/** Model IDs that are general-purpose chat models (excludes embeddings, TTS, etc.) */
const GENERAL_PURPOSE_PREFIXES = ['gpt-3.5', 'gpt-4', 'gpt-5']

function isGeneralPurposeModel (id: string): boolean {
  return GENERAL_PURPOSE_PREFIXES.some(prefix => id.startsWith(prefix)) &&
    !id.includes('embedding') &&
    !id.startsWith('tts-') &&
    !id.startsWith('whisper')
}

/** Parse version from gpt-X.Y-chat-latest for sorting (e.g. 5.2, 4.1). Higher = newer. */
function parseChatLatestVersion (id: string): number {
  const match = id.match(/^gpt-(\d+)\.(\d+)-chat-latest$/i)
  if (!match) return 0
  const major = parseInt(match[1], 10)
  const minor = parseInt(match[2], 10)
  return major * 100 + minor
}

/**
 * Fetches the best fallback model for translation when primary is unavailable.
 * Prefers gpt-X.X-chat-latest variants, newest version first (gpt-5.2 > gpt-5.1 > gpt-4.x).
 * @param openaiApiKey - OpenAI API key
 * @param primaryModelToExclude - The primary model to exclude from fallback (default: TRANSLATION_PRIMARY_MODEL)
 */
export async function getTranslationFallbackModel (openaiApiKey: string, primaryModelToExclude?: string): Promise<string> {
  const exclude = primaryModelToExclude ?? TRANSLATION_PRIMARY_MODEL
  const list = await $fetch<{
    data: Array<{ id: string; created: number }>
  }>('https://api.openai.com/v1/models', {
    headers: { Authorization: `Bearer ${openaiApiKey}` },
  })

  const chatLatest = (list.data ?? [])
    .filter(m => isGeneralPurposeModel(m.id) && m.id.match(/^gpt-\d+\.\d+-chat-latest$/i) && m.id !== exclude)
    .sort((a, b) => parseChatLatestVersion(b.id) - parseChatLatestVersion(a.id))

  const best = chatLatest[0]
  if (best) return best.id

  // Fallback to any general-purpose model if no -chat-latest exists
  const generalPurpose = (list.data ?? [])
    .filter(m => isGeneralPurposeModel(m.id))
    .sort((a, b) => (b.created ?? 0) - (a.created ?? 0))

  return generalPurpose[0]?.id ?? 'gpt-4o'
}
