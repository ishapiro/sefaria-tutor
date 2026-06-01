import { defineEventHandler, createError, getRouterParam, readBody } from 'h3'
import { requireUserRole } from '~/server/utils/auth'

export default defineEventHandler(async (event) => {
  const userData = await requireUserRole(event, ['general', 'team', 'admin'])

  // @ts-ignore
  const db = event.context.cloudflare?.env?.DB
  if (!db) throw createError({ statusCode: 500, message: 'Database connection not available' })
  if (!userData.id) throw createError({ statusCode: 401, message: 'User not found' })

  const listId = parseInt(getRouterParam(event, 'id') || '', 10)
  const shareId = parseInt(getRouterParam(event, 'shareId') || '', 10)
  if (isNaN(listId) || isNaN(shareId)) throw createError({ statusCode: 400, message: 'Invalid ID' })

  const body = await readBody(event)
  const permission = body?.permission
  if (permission !== 'read' && permission !== 'write') {
    throw createError({ statusCode: 400, message: 'permission must be "read" or "write"' })
  }

  // Only the owner can change permissions
  const list = await db.prepare('SELECT id FROM word_lists WHERE id = ? AND user_id = ?')
    .bind(listId, userData.id).first()
  if (!list) throw createError({ statusCode: 404, message: 'List not found' })

  const share = await db.prepare('SELECT id FROM word_list_shares WHERE id = ? AND list_id = ?')
    .bind(shareId, listId).first()
  if (!share) throw createError({ statusCode: 404, message: 'Share not found' })

  try {
    await db.prepare('UPDATE word_list_shares SET permission = ? WHERE id = ?')
      .bind(permission, shareId).run()
    return { success: true, permission }
  } catch (err: any) {
    throw createError({ statusCode: 500, message: err.message || 'Failed to update permission' })
  }
})
