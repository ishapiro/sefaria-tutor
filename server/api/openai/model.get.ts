import { createError, defineEventHandler, getHeader } from 'h3'
import { useRuntimeConfig } from 'nitropack/runtime/internal/config'
import { resolveTranslationModel } from '~/server/utils/translation-model'
import { getDefaultTranslationModel, saveDefaultTranslationModel } from '~/server/utils/system-settings'
import { createOpenAIError } from '~/server/utils/openai-errors'

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
    // @ts-ignore
    const db = event.context.cloudflare?.env?.DB
    const configuredModel = await getDefaultTranslationModel(db)
    const resolved = await resolveTranslationModel(openaiApiKey, db, configuredModel)

    if (resolved.source === 'auto' && configuredModel !== resolved.model) {
      await saveDefaultTranslationModel(db, resolved.model)
    }

    return { model: resolved.model }
  } catch (err: unknown) {
    throw createOpenAIError(err, 'OpenAI model discovery')
  }
})
