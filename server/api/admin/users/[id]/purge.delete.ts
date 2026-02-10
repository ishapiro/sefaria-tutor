import { defineEventHandler, createError, getRouterParam } from 'h3'
import { requireUserRole } from '../../../../utils/auth'

export default defineEventHandler(async (event) => {
  // Require admin role
  await requireUserRole(event, ['admin'])

  const userId = getRouterParam(event, 'id')
  if (!userId) {
    throw createError({
      statusCode: 400,
      message: 'User ID is required'
    })
  }

  // @ts-ignore
  const db = event.context.cloudflare?.env?.DB

  if (!db) {
    throw createError({
      statusCode: 500,
      message: 'Database connection not available'
    })
  }

  try {
    // Check if user exists
    const user = await db.prepare('SELECT id FROM users WHERE id = ?')
      .bind(userId)
      .first<{ id: string }>()

    if (!user) {
      throw createError({
        statusCode: 404,
        message: 'User not found'
      })
    }

    // Hard delete: permanently remove user from database
    await db.prepare('DELETE FROM users WHERE id = ?')
      .bind(userId)
      .run()

    return {
      message: 'User purged permanently'
    }
  } catch (err: any) {
    if (err.statusCode) {
      throw err
    }
    throw createError({
      statusCode: 500,
      message: err.message || 'Failed to purge user'
    })
  }
})

