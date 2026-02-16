import { createError, defineEventHandler } from 'h3'
import { useRuntimeConfig } from 'nitropack/runtime/internal/config'
import { $fetch } from 'ofetch'
import { requireUserRole } from '~/server/utils/auth'

/** Model IDs that are general-purpose chat/completion models (excludes embeddings, TTS, etc.) */
const GENERAL_PURPOSE_PREFIXES = ['gpt-3.5', 'gpt-4', 'gpt-5', 'o1', 'o3']

/** Variant suffixes that indicate a specialized model (not the generic base) */
const VARIANT_SUFFIXES = ['instant', 'codex', 'pro', 'mini', 'nano', 'turbo', 'vision', 'chat-latest', 'thinking']

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

/** Preference: chat-latest > instant > mini > turbo > base; codex excluded. Higher = better. */
function modelPreferenceScore (id: string, baseId: string): number {
  if (id.includes('-chat-latest')) return 5
  if (id.includes('-instant')) return 4
  if (id.includes('-mini')) return 3
  if (id.includes('-turbo')) return 2
  if (id === baseId) return 1
  if (id.includes('-codex')) return -1
  return 0
}

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

  try {
    const list = await $fetch<{
      data: Array<{ id: string; object: string; created: number; owned_by?: string }>
    }>('https://api.openai.com/v1/models', {
      headers: {
        Authorization: `Bearer ${openaiApiKey}`,
      },
    })

    const generalPurpose = (list.data ?? [])
      .filter(m => isGeneralPurposeModel(m.id))

    // Group by base model id
    const byBase = new Map<string, typeof generalPurpose>()
    for (const m of generalPurpose) {
      const base = getBaseModelId(m.id)
      if (!byBase.has(base)) byBase.set(base, [])
      byBase.get(base)!.push(m)
    }

    // Sort bases by newest family first
    const sortedBases = [...byBase.entries()].sort(([, a], [, b]) => {
      const maxA = Math.max(...a.map(m => m.created ?? 0))
      const maxB = Math.max(...b.map(m => m.created ?? 0))
      return maxB - maxA
    })

    // Flatten to sorted list of model IDs (prefer chat-latest, instant, mini, turbo; skip codex)
    const modelIds: string[] = []
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
      for (const m of eligible) {
        modelIds.push(m.id)
      }
    }

    return { models: modelIds }
  } catch (err: unknown) {
    const status = (err as { statusCode?: number })?.statusCode ?? 500
    const data = (err as { data?: { error?: { message?: string } } })?.data
    const message = data?.error?.message ?? (err instanceof Error ? err.message : 'OpenAI models request failed')
    throw createError({
      statusCode: status >= 400 && status < 500 ? status : 502,
      statusMessage: status === 400 ? 'Bad Request' : 'Bad Gateway',
      message,
    })
  }
})
