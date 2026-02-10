import { defineEventHandler, createError, getRouterParam } from 'h3'
import { requireUserRole } from '~/server/utils/auth'

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
    const user = await db.prepare('SELECT id, email, name, role, is_verified, deleted_at FROM users WHERE id = ?')
      .bind(userId)
      .first<{ id: string; email: string; name: string | null; role: string; is_verified: boolean; deleted_at: number | null }>()

    if (!user) {
      throw createError({
        statusCode: 404,
        message: 'User not found'
      })
    }

    return user
  } catch (err: any) {
    if (err.statusCode) {
      throw err
    }
    throw createError({
      statusCode: 500,
      message: err.message || 'Failed to fetch user'
    })
  }
})
