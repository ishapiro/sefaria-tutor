import { defineEventHandler, createError, getRouterParam, readBody } from 'h3'
import { requireUserRole } from '~/server/utils/auth'

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/

export default defineEventHandler(async (event) => {
  const userData = await requireUserRole(event, ['general', 'team', 'admin'])

  // @ts-ignore
  const db = event.context.cloudflare?.env?.DB
  if (!db) throw createError({ statusCode: 500, message: 'Database connection not available' })
  if (!userData.id) throw createError({ statusCode: 401, message: 'User not found' })

  const listId = parseInt(getRouterParam(event, 'id') || '', 10)
  if (isNaN(listId)) throw createError({ statusCode: 400, message: 'Invalid list ID' })

  const body = await readBody(event)
  const email = typeof body?.email === 'string' ? body.email.trim().toLowerCase() : ''
  if (!email || !EMAIL_RE.test(email)) {
    throw createError({ statusCode: 400, message: 'A valid email address is required' })
  }
  const permission: 'read' | 'write' = body?.permission === 'write' ? 'write' : 'read'

  // Only the owner can share
  const list = await db.prepare('SELECT id FROM word_lists WHERE id = ? AND user_id = ?')
    .bind(listId, userData.id).first()
  if (!list) throw createError({ statusCode: 404, message: 'List not found' })

  // Cannot share with yourself
  const ownerRow = await db.prepare('SELECT email FROM users WHERE id = ? AND deleted_at IS NULL')
    .bind(userData.id).first() as { email: string } | null
  if (ownerRow?.email?.toLowerCase() === email) {
    throw createError({ statusCode: 400, message: 'You cannot share a list with yourself' })
  }

  // Look up whether the target email has an account
  const targetUser = await db.prepare('SELECT id FROM users WHERE email = ? AND deleted_at IS NULL')
    .bind(email).first() as { id: string } | null

  const now = Math.floor(Date.now() / 1000)

  try {
    const result = await db.prepare(
      'INSERT INTO word_list_shares (list_id, owner_id, shared_with_email, shared_with_user_id, permission, created_at) VALUES (?, ?, ?, ?, ?, ?) RETURNING id'
    ).bind(listId, userData.id, email, targetUser?.id ?? null, permission, now).first() as { id: number } | null

    if (!result) throw new Error('Failed to insert share')

    return {
      id: result.id,
      email,
      hasAccount: targetUser !== null,
      permission,
      createdAt: now,
    }
  } catch (err: any) {
    if (err.message?.includes('UNIQUE constraint')) {
      throw createError({ statusCode: 409, message: 'This list is already shared with that email' })
    }
    throw createError({ statusCode: 500, message: err.message || 'Failed to share list' })
  }
})
