import { defineEventHandler, createError, getRouterParam } from 'h3'
import { requireUserRole } from '~/server/utils/auth'

export default defineEventHandler(async (event) => {
  const userData = await requireUserRole(event, ['general', 'team', 'admin'])

  // @ts-ignore
  const db = event.context.cloudflare?.env?.DB
  if (!db) throw createError({ statusCode: 500, message: 'Database connection not available' })
  if (!userData.id) throw createError({ statusCode: 401, message: 'User not found' })

  const listId = parseInt(getRouterParam(event, 'id') || '', 10)
  if (isNaN(listId)) throw createError({ statusCode: 400, message: 'Invalid list ID' })

  // Only the owner can view shares
  const list = await db.prepare('SELECT id FROM word_lists WHERE id = ? AND user_id = ?')
    .bind(listId, userData.id).first()
  if (!list) throw createError({ statusCode: 404, message: 'List not found' })

  try {
    const { results } = await db.prepare(
      'SELECT id, shared_with_email, shared_with_user_id, permission, created_at FROM word_list_shares WHERE list_id = ? ORDER BY created_at ASC'
    ).bind(listId).all()

    const shares = (results || []) as Array<{
      id: number; shared_with_email: string; shared_with_user_id: string | null; permission: string; created_at: number
    }>

    return {
      shares: shares.map(s => ({
        id: s.id,
        email: s.shared_with_email,
        hasAccount: s.shared_with_user_id !== null,
        permission: s.permission as 'read' | 'write',
        createdAt: s.created_at,
      }))
    }
  } catch (err: any) {
    throw createError({ statusCode: 500, message: err.message || 'Failed to fetch shares' })
  }
})
