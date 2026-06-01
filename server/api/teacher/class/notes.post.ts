import { defineEventHandler, createError, readBody } from 'h3'
import { requireUserRole } from '~/server/utils/auth'

export default defineEventHandler(async (event) => {
  const userData = await requireUserRole(event, ['team', 'admin'])

  // @ts-ignore
  const db = event.context.cloudflare?.env?.DB
  if (!db) throw createError({ statusCode: 500, message: 'Database connection not available' })
  if (!userData.id) throw createError({ statusCode: 401, message: 'User not found' })

  const body = await readBody(event)
  const noteId = typeof body?.noteId === 'number' ? body.noteId : parseInt(String(body?.noteId), 10)
  const classId = typeof body?.classId === 'string' ? body.classId.trim() : ''
  if (isNaN(noteId)) throw createError({ statusCode: 400, message: 'noteId is required' })
  if (!classId) throw createError({ statusCode: 400, message: 'classId is required' })

  // Verify teacher owns this note
  const note = await db.prepare('SELECT id FROM user_notes WHERE id = ? AND user_id = ?')
    .bind(noteId, userData.id).first()
  if (!note) throw createError({ statusCode: 404, message: 'Note not found' })

  // Verify teacher leads this class
  const team = await db.prepare('SELECT id FROM teams WHERE id = ? AND leader_id = ?')
    .bind(classId, userData.id).first()
  if (!team) throw createError({ statusCode: 404, message: 'Class not found' })

  const now = Math.floor(Date.now() / 1000)

  try {
    await db.prepare(
      'INSERT OR IGNORE INTO class_notes (team_id, teacher_id, note_id, published_at) VALUES (?, ?, ?, ?)'
    ).bind(classId, userData.id, noteId, now).run()

    return { success: true }
  } catch (err: any) {
    throw createError({ statusCode: 500, message: err.message || 'Failed to publish note' })
  }
})
