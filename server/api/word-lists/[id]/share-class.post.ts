import { defineEventHandler, createError, getRouterParam, readBody } from 'h3'
import { requireUserRole } from '~/server/utils/auth'

export default defineEventHandler(async (event) => {
  const userData = await requireUserRole(event, ['team', 'admin'])

  // @ts-ignore
  const db = event.context.cloudflare?.env?.DB
  if (!db) throw createError({ statusCode: 500, message: 'Database connection not available' })
  if (!userData.id) throw createError({ statusCode: 401, message: 'User not found' })

  const listId = parseInt(getRouterParam(event, 'id') || '', 10)
  if (isNaN(listId)) throw createError({ statusCode: 400, message: 'Invalid list ID' })

  const body = await readBody(event)
  const classId = typeof body?.classId === 'string' ? body.classId.trim() : ''
  if (!classId) throw createError({ statusCode: 400, message: 'classId is required' })

  // Verify teacher owns the list
  const list = await db.prepare('SELECT id FROM word_lists WHERE id = ? AND user_id = ?')
    .bind(listId, userData.id).first()
  if (!list) throw createError({ statusCode: 404, message: 'List not found' })

  // Verify teacher leads this class
  const team = await db.prepare('SELECT id FROM teams WHERE id = ? AND leader_id = ?')
    .bind(classId, userData.id).first()
  if (!team) throw createError({ statusCode: 404, message: 'Class not found' })

  const now = Math.floor(Date.now() / 1000)

  try {
    await db.prepare(
      `INSERT OR IGNORE INTO word_list_shares
         (list_id, owner_id, shared_with_email, shared_with_team_id, permission, created_at)
       VALUES (?, ?, '', ?, 'read', ?)`
    ).bind(listId, userData.id, classId, now).run()

    return { success: true }
  } catch (err: any) {
    throw createError({ statusCode: 500, message: err.message || 'Failed to share with class' })
  }
})
