export type ReasoningEffort = 'none' | 'low' | 'medium'

const EFFORT_ORDER: readonly ReasoningEffort[] = ['none', 'low', 'medium']

// Module-level cache: persists for the lifetime of the worker/process instance.
// Stores the index of the minimum effort level known to work for each model.
const effortMinIndex = new Map<string, number>()

/**
 * Returns the effort level to use for a model.
 * Uses `preferred` unless the cache has discovered the model requires something higher.
 */
export function getCachedEffort(model: string, preferred: ReasoningEffort = 'low'): ReasoningEffort {
  const minIdx = effortMinIndex.get(model) ?? EFFORT_ORDER.indexOf(preferred)
  const prefIdx = EFFORT_ORDER.indexOf(preferred)
  return EFFORT_ORDER[Math.max(minIdx, prefIdx)] ?? 'medium'
}

/**
 * Records that `effort` was rejected by the model.
 * Advances the cached minimum to the next level in the chain.
 */
export function markEffortUnsupported(model: string, effort: ReasoningEffort): void {
  const nextIdx = EFFORT_ORDER.indexOf(effort) + 1
  if (nextIdx < EFFORT_ORDER.length) {
    effortMinIndex.set(model, Math.max(effortMinIndex.get(model) ?? 0, nextIdx))
  }
}

/**
 * Returns true when the OpenAI error is the "unsupported reasoning effort" error.
 * e.g. "Unsupported value: 'low' is not supported with the 'gpt-X' model. Supported values are: 'medium'."
 */
export function isUnsupportedEffortError(err: unknown): boolean {
  const msg = (
    (err as { data?: { error?: { message?: string } } })?.data?.error?.message ??
    (err instanceof Error ? err.message : '')
  ).toLowerCase()
  return msg.includes('is not supported') && msg.includes('supported values are')
}

/**
 * Estimates max_output_tokens needed for a translation response.
 * Each Hebrew/Aramaic word produces a full JSON word-entry (~300 tokens).
 * Add ~600 tokens overhead for the outer JSON envelope and translated phrase.
 */
export function estimateMaxOutputTokens(inputText: string, fullSentence: boolean): number {
  const wordCount = inputText.trim().split(/\s+/).filter(Boolean).length
  const estimated = wordCount * 300 + 600
  const min = 1500
  const max = fullSentence ? 12000 : 5000
  return Math.min(Math.max(estimated, min), max)
}
