import { createError, defineEventHandler, readBody } from 'h3'
import { requireUserRole } from '~/server/utils/auth'

export default defineEventHandler(async (event) => {
  await requireUserRole(event, ['admin'])

  // @ts-ignore
  const db = event.context.cloudflare?.env?.DB

  if (!db) {
    throw createError({
      statusCode: 500,
      message: 'Database connection not available',
    })
  }

  const body = await readBody<{ model?: string }>(event)
  const model = body?.model?.trim()

  if (!model) {
    throw createError({
      statusCode: 400,
      message: 'Model is required',
    })
  }

  try {
    const now = Math.floor(Date.now() / 1000)
    await db.prepare(
      'INSERT INTO system_settings (key, value, updated_at) VALUES (?, ?, ?) ON CONFLICT(key) DO UPDATE SET value = excluded.value, updated_at = excluded.updated_at'
    )
      .bind('translation_default_model', model, now)
      .run()

    return { success: true, model }
  } catch (err: any) {
    throw createError({
      statusCode: 500,
      message: err.message || 'Failed to update default model',
    })
  }
})
