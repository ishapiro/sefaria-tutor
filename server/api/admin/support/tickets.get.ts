import { createError, getQuery } from 'h3'
import { requireUserRole } from '~/server/utils/auth'

export default defineEventHandler(async (event) => {
  await requireUserRole(event, ['admin'])

  // @ts-ignore
  const db = event.context.cloudflare?.env?.DB
  if (!db) {
    throw createError({
      statusCode: 500,
      message: 'Database connection not available'
    })
  }

  const query = getQuery(event)

  const search = typeof query.search === 'string' ? query.search.trim().slice(0, 100) : ''
  const statusFilter = typeof query.status === 'string' ? query.status.trim() : ''
  const limit = Math.min(Math.max(parseInt(String(query.limit || 50), 10) || 50, 1), 100)
  const offset = Math.max(parseInt(String(query.offset || 0), 10) || 0, 0)

  const conditions: string[] = []
  const params: unknown[] = []

  if (statusFilter === 'not-closed') {
    conditions.push("status NOT IN ('closed', 'dismissed')")
  } else if (statusFilter && ['new', 'open', 'closed', 'in-progress', 'wish-list', 'dismissed'].includes(statusFilter)) {
    conditions.push('status = ?')
    params.push(statusFilter)
  }
  if (search) {
    conditions.push('(email LIKE ? OR description LIKE ? OR reference LIKE ?)')
    const pattern = `%${search}%`
    params.push(pattern, pattern, pattern)
  }

  const whereSql = conditions.length ? ` WHERE ${conditions.join(' AND ')}` : ''

  const countRow = (await db
    .prepare(`SELECT COUNT(*) as total FROM support_tickets${whereSql}`)
    .bind(...params)
    .first()) as { total: number } | null
  const total = countRow?.total ?? 0

  const rows = (await db
    .prepare(
      `SELECT id, user_id, email, page_url, reference, type_bug, type_suggestion, type_help, description, status, created_at, updated_at
       FROM support_tickets${whereSql}
       ORDER BY updated_at DESC
       LIMIT ? OFFSET ?`
    )
    .bind(...params, limit, offset)
    .all()) as {
    results: Array<{
      id: string
      user_id: string
      email: string
      page_url: string | null
      reference: string | null
      type_bug: number
      type_suggestion: number
      type_help: number
      description: string
      status: string
      created_at: number
      updated_at: number
    }>
  }

  return {
    tickets: rows.results || [],
    total,
    limit,
    offset
  }
})
