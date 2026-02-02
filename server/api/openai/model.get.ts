import { createError, defineEventHandler, getHeader } from 'h3'
import { useRuntimeConfig } from 'nitropack/runtime/internal/config'
import { $fetch } from 'ofetch'

/** Model IDs that are general-purpose chat/completion models (excludes embeddings, TTS, etc.) */
const GENERAL_PURPOSE_PREFIXES = ['gpt-3.5', 'gpt-4', 'gpt-5', 'o1', 'o3']

function isGeneralPurposeModel (id: string): boolean {
  return GENERAL_PURPOSE_PREFIXES.some(prefix => id.startsWith(prefix)) &&
    !id.includes('embedding') &&
    !id.startsWith('tts-') &&
    !id.startsWith('whisper')
}

export default defineEventHandler(async (event) => {
  const config = useRuntimeConfig(event)
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
      .sort((a, b) => (b.created ?? 0) - (a.created ?? 0))

    const latest = generalPurpose[0]
    const modelId = latest?.id ?? 'gpt-4o'

    return { model: modelId }
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
