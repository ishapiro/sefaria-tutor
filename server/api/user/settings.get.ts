import { defineEventHandler, createError } from 'h3'
import { requireUserRole } from '~/server/utils/auth'

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

  try {
    const { results } = await db.prepare(
      'SELECT key, value FROM user_settings WHERE user_id = ?'
    )
      .bind(userData.id)
      .all()

    const settings: Record<string, string> = {}
    for (const row of (results || []) as Array<{ key: string; value: string }>) {
      settings[row.key] = row.value
    }
    return settings
  } catch (err: any) {
    throw createError({
      statusCode: 500,
      message: err.message || 'Failed to fetch settings'
    })
  }
})
