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
    // Check if user exists and is not already deleted
    const user = await db.prepare('SELECT id, deleted_at FROM users WHERE id = ?')
      .bind(userId)
      .first<{ id: string; deleted_at: number | null }>()

    if (!user) {
      throw createError({
        statusCode: 404,
        message: 'User not found'
      })
    }

    if (user.deleted_at) {
      throw createError({
        statusCode: 400,
        message: 'User is already deleted'
      })
    }

    // Soft delete: set deleted_at timestamp
    const deletedAt = Math.floor(Date.now() / 1000)
    await db.prepare('UPDATE users SET deleted_at = ? WHERE id = ?')
      .bind(deletedAt, userId)
      .run()

    return {
      message: 'User deleted successfully',
      deleted_at: deletedAt
    }
  } catch (err: any) {
    if (err.statusCode) {
      throw err
    }
    throw createError({
      statusCode: 500,
      message: err.message || 'Failed to delete user'
    })
  }
})

