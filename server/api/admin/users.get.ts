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
    // Check if we should include deleted users and apply search/pagination
    const query = getQuery(event)
    const includeDeleted = query.includeDeleted === 'true'

    const rawSearch = (query.q as string | undefined) || ''
    const search = rawSearch.trim()

    const rawLimit = (query.limit as string | undefined) || '50'
    const rawOffset = (query.offset as string | undefined) || '0'

    let limit = Number.parseInt(rawLimit, 10)
    if (!Number.isFinite(limit) || limit <= 0) limit = 50
    if (limit > 100) limit = 100

    let offset = Number.parseInt(rawOffset, 10)
    if (!Number.isFinite(offset) || offset < 0) offset = 0

    const conditions: string[] = []
    const params: unknown[] = []

    if (!includeDeleted) {
      conditions.push('deleted_at IS NULL')
    }

    if (search) {
      conditions.push('(email LIKE ? OR name LIKE ?)')
      const pattern = `%${search}%`
      params.push(pattern, pattern)
    }

    const whereSql = conditions.length ? ` WHERE ${conditions.join(' AND ')}` : ''

    // Total count for pagination
    const countRow = await db
      .prepare(`SELECT COUNT(*) as total FROM users${whereSql}`)
      .bind(...params)
      .first<{ total: number }>()

    const total = countRow?.total ?? 0

    // Paged query
    const sql =
      `SELECT id, email, name, role, is_verified, deleted_at FROM users` +
      whereSql +
      ' ORDER BY deleted_at IS NULL DESC, email LIMIT ? OFFSET ?'

    const users = await db
      .prepare(sql)
      .bind(...params, limit, offset)
      .all<{
        id: string
        email: string
        name: string | null
        role: string
        is_verified: boolean
        deleted_at: number | null
      }>()

    return {
      users: users.results || [],
      total,
      limit,
      offset
    }
  } catch (err: any) {
    throw createError({
      statusCode: 500,
      message: err.message || 'Failed to fetch users'
    })
  }
})
