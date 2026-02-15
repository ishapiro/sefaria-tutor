import { defineEventHandler, createError, readBody } from 'h3'
import { requireUserRole } from '~/server/utils/auth'

const ALLOWED_KEYS = new Set(['flashcard_correct_repetitions', 'flashcard_session_size', 'flashcard_session_card_multiplier', 'long_phrase_word_limit'])

export default defineEventHandler(async (event) => {
  const userData = await requireUserRole(event, ['general', 'team', 'admin'])

  // @ts-ignore
  const db = event.context.cloudflare?.env?.DB

  if (!db) {
    throw createError({
      statusCode: 500,
      message: 'Database connection not available'
    })
  }

  if (!userData.id) {
    throw createError({
      statusCode: 401,
      message: 'User not found'
    })
  }

  let body: Record<string, unknown> = {}
  try {
    body = await readBody(event).catch(() => ({}))
  } catch {
    body = {}
  }

  const settings = body.settings && typeof body.settings === 'object'
    ? (body.settings as Record<string, unknown>)
    : body

  const toSet: Array<{ key: string; value: string }> = []
  for (const [key, value] of Object.entries(settings)) {
    if (!ALLOWED_KEYS.has(key)) continue
    toSet.push({ key, value: String(value ?? '') })
  }

  if (toSet.length === 0) {
    return { success: true, message: 'No valid settings to update' }
  }

  try {
    for (const { key, value } of toSet) {
      await db.prepare(
        'INSERT INTO user_settings (user_id, key, value) VALUES (?, ?, ?) ON CONFLICT (user_id, key) DO UPDATE SET value = excluded.value'
      )
        .bind(userData.id, key, value)
        .run()
    }
    return { success: true, message: 'Settings updated' }
  } catch (err: any) {
    throw createError({
      statusCode: 500,
      message: err.message || 'Failed to update settings'
    })
  }
})
