import { defineEventHandler, createError } from 'h3'
import { requireUserRole } from '../../utils/auth'

export default defineEventHandler(async (event) => {
  // Require admin role
  await requireUserRole(event, ['admin'])

  // @ts-ignore
  const db = event.context.cloudflare?.env?.DB

  if (!db) {
    throw createError({
      statusCode: 500,
      message: 'Database connection not available'
    })
  }

  try {
    const users = await db.prepare('SELECT id, email, name, role, is_verified FROM users ORDER BY email')
      .all<{ id: string; email: string; name: string | null; role: string; is_verified: boolean }>()

    return users.results || []
  } catch (err: any) {
    throw createError({
      statusCode: 500,
      message: err.message || 'Failed to fetch users'
    })
  }
})
