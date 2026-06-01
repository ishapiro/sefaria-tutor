import { defineEventHandler, createError, getRouterParam } from 'h3'
import { requireUserRole } from '~/server/utils/auth'

export default defineEventHandler(async (event) => {
  const userData = await requireUserRole(event, ['team', 'admin'])

  // @ts-ignore
  const db = event.context.cloudflare?.env?.DB
  if (!db) throw createError({ statusCode: 500, message: 'Database connection not available' })
  if (!userData.id) throw createError({ statusCode: 401, message: 'User not found' })

  const classId = getRouterParam(event, 'classId')
  const userId = getRouterParam(event, 'userId')
  if (!classId || !userId) throw createError({ statusCode: 400, message: 'classId and userId are required' })

  const team = await db.prepare('SELECT id FROM teams WHERE id = ? AND leader_id = ?')
    .bind(classId, userData.id).first()
  if (!team) throw createError({ statusCode: 404, message: 'Class not found' })

  const student = await db.prepare('SELECT id FROM users WHERE id = ? AND team_id = ? AND deleted_at IS NULL')
    .bind(userId, classId).first()
  if (!student) throw createError({ statusCode: 404, message: 'Student not found in this class' })

  await db.prepare('UPDATE users SET team_id = NULL WHERE id = ?').bind(userId).run()
  return { success: true }
})
