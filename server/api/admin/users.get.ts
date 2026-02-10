import { defineEventHandler, createError, getQuery } from 'h3'
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
    // Check if we should include deleted users
    const query = getQuery(event)
    const includeDeleted = query.includeDeleted === 'true'
    
    let sql = 'SELECT id, email, name, role, is_verified, deleted_at FROM users'
    if (!includeDeleted) {
      sql += ' WHERE deleted_at IS NULL'
    }
    sql += ' ORDER BY deleted_at IS NULL DESC, email'
    
    const users = await db.prepare(sql)
      .all<{ id: string; email: string; name: string | null; role: string; is_verified: boolean; deleted_at: number | null }>()

    return users.results || []
  } catch (err: any) {
    throw createError({
      statusCode: 500,
      message: err.message || 'Failed to fetch users'
    })
  }
})
