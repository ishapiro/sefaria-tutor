import { createError } from 'h3'
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

  const userId = userData.id
  if (!userId) {
    throw createError({
      statusCode: 401,
      message: 'User ID not found in session'
    })
  }

  const rows = (await db
    .prepare(
      'SELECT id, email, page_url, reference, type_bug, type_suggestion, type_help, description, status, created_at, updated_at FROM support_tickets WHERE user_id = ? ORDER BY created_at DESC'
    )
    .bind(userId)
    .all()) as {
    results: Array<{
      id: string
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
    tickets: rows.results || []
  }
})
