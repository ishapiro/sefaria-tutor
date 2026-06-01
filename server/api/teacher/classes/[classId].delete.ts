import { defineEventHandler, createError, getRouterParam } from 'h3'
import { requireUserRole } from '~/server/utils/auth'

export default defineEventHandler(async (event) => {
  const userData = await requireUserRole(event, ['team', 'admin'])

  // @ts-ignore
  const db = event.context.cloudflare?.env?.DB
  if (!db) throw createError({ statusCode: 500, message: 'Database connection not available' })
  if (!userData.id) throw createError({ statusCode: 401, message: 'User not found' })

  const classId = getRouterParam(event, 'classId')
  if (!classId) throw createError({ statusCode: 400, message: 'classId is required' })

  const team = await db.prepare('SELECT id FROM teams WHERE id = ? AND leader_id = ?')
    .bind(classId, userData.id).first()
  if (!team) throw createError({ statusCode: 404, message: 'Class not found' })

  try {
    // Clear team_id for all students in this class
    await db.prepare('UPDATE users SET team_id = NULL WHERE team_id = ?').bind(classId).run()
    // Delete the class (cascades to word_list_shares, class_notes)
    await db.prepare('DELETE FROM teams WHERE id = ?').bind(classId).run()
    return { success: true }
  } catch (err: any) {
    throw createError({ statusCode: 500, message: err.message || 'Failed to delete class' })
  }
})
