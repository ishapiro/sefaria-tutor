import { $fetch } from 'ofetch'
import { TRANSLATION_PRIMARY_MODEL } from '~/utils/model-defaults'
import { getCachedEffort, markEffortUnsupported, isUnsupportedEffortError, type ReasoningEffort } from '~/server/utils/openai-reasoning'

/** Primary model for translation: fast, no thinking, optimized for scripture. */
export { TRANSLATION_PRIMARY_MODEL }

/** Primary model for TTS audio generation. */
export const TTS_PRIMARY_MODEL = 'gpt-4o-mini-tts'

/** Model IDs that are general-purpose chat models (excludes embeddings, TTS, etc.) */
const GENERAL_PURPOSE_PREFIXES = ['gpt-3.5', 'gpt-4', 'gpt-5', 'o1', 'o3']

/** Variant suffixes that indicate a specialized model (not the generic base) */
const VARIANT_SUFFIXES = ['instant', 'codex', 'pro', 'mini', 'nano', 'turbo', 'vision', 'chat-latest', 'thinking']

const MODEL_LIST_CACHE_TTL_MS = 5 * 60 * 1000

type OpenAIModel = { id: string; created: number }

const modelListCache: {
  expiresAt: number
  data: OpenAIModel[]
} = {
  expiresAt: 0,
  data: [],
}

function isGeneralPurposeModel (id: string): boolean {
  return GENERAL_PURPOSE_PREFIXES.some(prefix => id.startsWith(prefix)) &&
    !id.includes('embedding') &&
    !id.startsWith('tts-') &&
    !id.startsWith('whisper')
}

/** Extract base model id (e.g. gpt-5.2 from gpt-5.2-instant or gpt-5.2-codex) */
function getBaseModelId (id: string): string {
  for (const suffix of VARIANT_SUFFIXES) {
    const pattern = new RegExp(`-${suffix}(-[a-z0-9.-]*)?$`, 'i')
    if (pattern.test(id)) {
      return id.replace(pattern, '')
    }
  }
  return id
}

/** Preference: instant > chat-latest > mini > turbo > base; codex excluded. Higher = better. */
function modelPreferenceScore (id: string, baseId: string): number {
  if (id.includes('-instant')) return 6
  if (id.includes('-chat-latest')) return 5
  if (id.includes('-mini')) return 3
  if (id.includes('-turbo')) return 2
  if (id === baseId) return 1
  if (id.includes('-codex')) return -1
  return 0
}

async function fetchOpenAIModelList (openaiApiKey: string, forceRefresh = false): Promise<OpenAIModel[]> {
  const now = Date.now()
  if (!forceRefresh && modelListCache.expiresAt > now && modelListCache.data.length > 0) {
    return modelListCache.data
  }

  const list = await $fetch<{
    data: Array<{ id: string; created: number }>
  }>('https://api.openai.com/v1/models', {
    headers: { Authorization: `Bearer ${openaiApiKey}` },
  })

  const models = (list.data ?? []).map(m => ({ id: m.id, created: m.created ?? 0 }))
  modelListCache.data = models
  modelListCache.expiresAt = now + MODEL_LIST_CACHE_TTL_MS
  return models
}

/**
 * Ranked list of eligible translation models, newest family first and best
 * variant first within each family. The head of this list is the heuristic
 * pick; the whole list is the candidate set offered to the recommender.
 */
export function listTranslationCandidates (models: OpenAIModel[], excludeModel?: string): string[] {
  const generalPurpose = models
    .filter(m => isGeneralPurposeModel(m.id))
    .filter(m => !excludeModel || m.id !== excludeModel)

  if (generalPurpose.length === 0) return []

  const byBase = new Map<string, OpenAIModel[]>()
  for (const m of generalPurpose) {
    const base = getBaseModelId(m.id)
    if (!byBase.has(base)) byBase.set(base, [])
    byBase.get(base)!.push(m)
  }

  const sortedBases = [...byBase.entries()].sort(([, a], [, b]) => {
    const maxA = Math.max(...a.map(m => m.created ?? 0))
    const maxB = Math.max(...b.map(m => m.created ?? 0))
    return maxB - maxA
  })

  const ranked: string[] = []
  for (const [baseId, family] of sortedBases) {
    if (!baseId || family.length === 0) continue
    const eligible = family
      .filter(m => modelPreferenceScore(m.id, baseId) >= 1)
      .sort((a, b) => {
        const scoreA = modelPreferenceScore(a.id, baseId)
        const scoreB = modelPreferenceScore(b.id, baseId)
        if (scoreA !== scoreB) return scoreB - scoreA
        return (b.created ?? 0) - (a.created ?? 0)
      })
    for (const m of eligible) ranked.push(m.id)
  }

  if (ranked.length > 0) return ranked

  return generalPurpose
    .slice()
    .sort((a, b) => (b.created ?? 0) - (a.created ?? 0))
    .map(m => m.id)
}

function pickBestCurrentTranslationModel (models: OpenAIModel[], excludeModel?: string): string {
  return listTranslationCandidates(models, excludeModel)[0] ?? TRANSLATION_PRIMARY_MODEL
}

/** Ranked candidates from the live model list, plus a signature of that set. */
export async function getTranslationCandidates (
  openaiApiKey: string,
): Promise<{ candidates: string[]; signature: string }> {
  const models = await fetchOpenAIModelList(openaiApiKey)
  const candidates = listTranslationCandidates(models)
  return { candidates, signature: candidates.slice().sort().join(',') }
}

const MODEL_CHOICE_INSTRUCTIONS = `You choose which OpenAI model to use for translating Biblical Hebrew and Aramaic (Tanakh) into English with detailed per-word morphological analysis: root (shoresh), binyan, tense, gender, and part of speech.

You will be given a list of available model ids. Reply with EXACTLY ONE id copied verbatim from that list. No explanation, no punctuation, no quotes, no other text.

Favor accuracy on morphology and rare Biblical vocabulary over speed. Do not pick reasoning-heavy or code-specialized variants.`

/**
 * Asks OpenAI which of the available models to use for Biblical Hebrew
 * translation. The question is put to `askerModel` — the newest model
 * available — and the answer is only accepted if it names a real candidate.
 * Returns null when the call fails or the reply is not usable.
 */
export async function askOpenAIForTranslationModel (
  openaiApiKey: string,
  candidates: string[],
  askerModel: string,
): Promise<string | null> {
  if (candidates.length === 0) return null

  type ModelChoiceResponse = { output?: Array<{ content?: Array<{ type?: string; text?: string }> }> }

  const callOpenAI = (effort: ReasoningEffort) => $fetch<ModelChoiceResponse>(
    'https://api.openai.com/v1/responses',
    {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${openaiApiKey}` },
      body: {
        model: askerModel,
        instructions: MODEL_CHOICE_INSTRUCTIONS,
        input: `Available models:\n${candidates.join('\n')}`,
        // Picking from a list needs no deliberation, so ask for the cheapest
        // effort the model accepts. This is what keeps the call near-free.
        reasoning: { effort },
        // Ceiling only — billed on tokens actually produced. Kept above the
        // one-line answer so an escalated effort level cannot starve it.
        max_output_tokens: 300,
        text: { verbosity: 'low' },
      },
    },
  )

  // Walk up the effort ladder only if the model rejects the cheaper level.
  let response: ModelChoiceResponse
  for (let attempt = 0; ; attempt++) {
    const effort = getCachedEffort(askerModel, 'none')
    try {
      response = await callOpenAI(effort)
      break
    } catch (err) {
      if (attempt >= 2 || !isUnsupportedEffortError(err)) throw err
      markEffortUnsupported(askerModel, effort)
    }
  }

  const content = response.output?.[0]?.content?.find(c => c.type === 'output_text')
  const answer = (content?.text ?? '').trim().replace(/^["'`]|["'`.]$/g, '').trim()

  // Only trust an answer that names an actually-available model.
  if (candidates.includes(answer)) return answer

  console.warn('[openai-models] Recommender returned an unusable model id; ignoring', {
    answer,
    askerModel,
  })
  return null
}

export async function getCurrentTranslationModel (
  openaiApiKey: string,
  preferredModel?: string,
): Promise<{ model: string; source: 'preferred' | 'auto' }> {
  const models = await fetchOpenAIModelList(openaiApiKey)
  const generalPurpose = models.filter(m => isGeneralPurposeModel(m.id))
  const bestCurrent = pickBestCurrentTranslationModel(generalPurpose)

  // Keep preferred only when it matches the current best choice.
  // Otherwise, auto-select the highest-ranked current model.
  if (preferredModel && preferredModel === bestCurrent && generalPurpose.some(m => m.id === preferredModel)) {
    return { model: preferredModel, source: 'preferred' }
  }

  return {
    model: bestCurrent,
    source: 'auto',
  }
}

/**
 * Fetches the best fallback model for translation when primary is unavailable.
 * Prefers instant variants when available, then chat-latest variants.
 * @param openaiApiKey - OpenAI API key
 * @param primaryModelToExclude - The primary model to exclude from fallback (default: TRANSLATION_PRIMARY_MODEL)
 */
export async function getTranslationFallbackModel (openaiApiKey: string, primaryModelToExclude?: string): Promise<string> {
  const exclude = primaryModelToExclude ?? TRANSLATION_PRIMARY_MODEL
  const models = await fetchOpenAIModelList(openaiApiKey)
  const best = pickBestCurrentTranslationModel(models, exclude)
  if (best && best !== exclude) return best

  // Refresh once in case cached model metadata became stale during a model rollout.
  const refreshed = await fetchOpenAIModelList(openaiApiKey, true)
  return pickBestCurrentTranslationModel(refreshed, exclude)
}
