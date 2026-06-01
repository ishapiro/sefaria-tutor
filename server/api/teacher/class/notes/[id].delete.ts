import { defineEventHandler, createError, getRouterParam, readBody } from 'h3'
import { requireUserRole } from '~/server/utils/auth'

export default defineEventHandler(async (event) => {
  const userData = await requireUserRole(event, ['team', 'admin'])

  // @ts-ignore
  const db = event.context.cloudflare?.env?.DB
  if (!db) throw createError({ statusCode: 500, message: 'Database connection not available' })
  if (!userData.id) throw createError({ statusCode: 401, message: 'User not found' })

  // id here is the class_notes.id (the publication record), not the note itself
  const id = parseInt(getRouterParam(event, 'id') || '', 10)
  if (isNaN(id)) throw createError({ statusCode: 400, message: 'Invalid ID' })

  const body = await readBody(event).catch(() => ({}))
  const classId = typeof body?.classId === 'string' ? body.classId.trim() : ''
  if (!classId) throw createError({ statusCode: 400, message: 'classId is required' })

  // Verify teacher leads the class
  const team = await db.prepare('SELECT id FROM teams WHERE id = ? AND leader_id = ?')
    .bind(classId, userData.id).first()
  if (!team) throw createError({ statusCode: 404, message: 'Class not found' })

  await db.prepare(
    'DELETE FROM class_notes WHERE id = ? AND team_id = ? AND teacher_id = ?'
  ).bind(id, classId, userData.id).run()

  return { success: true }
})
