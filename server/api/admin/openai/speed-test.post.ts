import { createError, defineEventHandler, readBody } from 'h3'
import { useRuntimeConfig } from 'nitropack/runtime/internal/config'
import { requireUserRole } from '~/server/utils/auth'
import { runTranslationBenchmark } from '~/server/utils/translation-benchmark'

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

  // @ts-ignore
  const db = event.context.cloudflare?.env?.DB
  return runTranslationBenchmark(model, openaiApiKey, db)
})
