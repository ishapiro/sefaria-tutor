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

  const body = await readBody(event).catch(() => ({}))
  const classId = typeof body?.classId === 'string' ? body.classId.trim() : ''
  if (!classId) throw createError({ statusCode: 400, message: 'classId is required' })

  const list = await db.prepare('SELECT id FROM word_lists WHERE id = ? AND user_id = ?')
    .bind(listId, userData.id).first()
  if (!list) throw createError({ statusCode: 404, message: 'List not found' })

  await db.prepare(
    'DELETE FROM word_list_shares WHERE list_id = ? AND shared_with_team_id = ? AND owner_id = ?'
  ).bind(listId, classId, userData.id).run()

  return { success: true }
})
