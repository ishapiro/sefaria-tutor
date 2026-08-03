import {
  getCurrentTranslationModel,
  getTranslationCandidates,
  askOpenAIForTranslationModel,
} from '~/server/utils/openai-models'
import {
  getRecommendedTranslationModel,
  saveRecommendedTranslationModel,
} from '~/server/utils/system-settings'

type D1Database = Parameters<typeof getRecommendedTranslationModel>[0]

export type ResolvedTranslationModel = {
  model: string
  source: 'preferred' | 'auto' | 'recommended'
}

/**
 * Resolves the translation model, asking OpenAI itself which of the available
 * models is best for Biblical Hebrew. The question is put to the newest model
 * available, and the answer is cached in D1 against a signature of the
 * candidate list — so it is asked once per change to the model lineup, not
 * once per request.
 *
 * Falls back to the ranking heuristic whenever the recommendation is
 * unavailable (no DB, OpenAI unreachable, out of credit, unusable reply).
 */
export async function resolveTranslationModel (
  openaiApiKey: string,
  db: D1Database,
  configuredModel?: string,
): Promise<ResolvedTranslationModel> {
  const heuristic = await getCurrentTranslationModel(openaiApiKey, configuredModel)

  try {
    const { candidates, signature } = await getTranslationCandidates(openaiApiKey)
    if (candidates.length === 0) return heuristic

    const cached = await getRecommendedTranslationModel(db)
    if (cached && cached.signature === signature && candidates.includes(cached.model)) {
      return { model: cached.model, source: 'recommended' }
    }

    // candidates[0] is the newest/highest-ranked model — ask it.
    const recommended = await askOpenAIForTranslationModel(openaiApiKey, candidates, candidates[0]!)
    if (!recommended) return heuristic

    console.log('[translation-model] OpenAI recommended model for Biblical Hebrew', {
      recommended,
      askedModel: candidates[0],
      heuristicModel: heuristic.model,
    })
    await saveRecommendedTranslationModel(db, recommended, signature)
    return { model: recommended, source: 'recommended' }
  } catch (e) {
    console.warn('[translation-model] Recommendation unavailable; using ranked pick', {
      model: heuristic.model,
      error: e instanceof Error ? e.message : String(e),
    })
    return heuristic
  }
}
