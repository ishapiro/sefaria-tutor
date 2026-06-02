import { createError, defineEventHandler, readBody } from 'h3'
import { useRuntimeConfig } from 'nitropack/runtime/internal/config'
import { requireUserRole } from '~/server/utils/auth'
import { runTranslationBenchmark, runGrammarBenchmark } from '~/server/utils/translation-benchmark'

export default defineEventHandler(async (event) => {
  await requireUserRole(event, ['admin'])

  // @ts-ignore
  const db = event.context.cloudflare?.env?.DB

  if (!db) {
    throw createError({ statusCode: 500, message: 'Database connection not available' })
  }

  const body = await readBody<{ model?: string }>(event)
  const model = body?.model?.trim()

  if (!model) {
    throw createError({ statusCode: 400, message: 'Model is required' })
  }

  const now = Math.floor(Date.now() / 1000)
  await db.prepare(
    'INSERT INTO system_settings (key, value, updated_at) VALUES (?, ?, ?) ON CONFLICT(key) DO UPDATE SET value = excluded.value, updated_at = excluded.updated_at'
  ).bind('translation_default_model', model, now).run()

  const config = useRuntimeConfig(event)
  const env = (globalThis as unknown as { process?: { env?: Record<string, string> } }).process?.env
  const openaiApiKey = config.openaiApiKey || env?.OPENAI_API_KEY || ''

  if (!openaiApiKey) {
    return { success: true, model, msPerWord: null, grammarMs: null }
  }

  const [translationResult, grammarResult] = await Promise.all([
    runTranslationBenchmark(model, openaiApiKey, db),
    runGrammarBenchmark(model, openaiApiKey, db),
  ])

  return {
    success: true,
    model,
    msPerWord: translationResult.success ? Math.ceil(translationResult.msPerWord) : null,
    grammarMs: grammarResult.success ? Math.ceil(grammarResult.durationMs) : null,
  }
})
