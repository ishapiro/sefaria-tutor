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
    const { results } = await db.prepare(`
      SELECT u.id, u.name, u.email, u.created_at,
             COUNT(DISTINCT wlp.word_list_id) as words_studied,
             SUM(wlp.times_correct) as total_correct,
             SUM(wlp.times_shown)   as total_shown
      FROM users u
      LEFT JOIN word_list_progress wlp ON wlp.user_id = u.id
      WHERE u.team_id = ? AND u.deleted_at IS NULL
      GROUP BY u.id
      ORDER BY u.name
    `).bind(classId).all()

    const students = (results || []) as Array<{
      id: string; name: string | null; email: string; created_at: number
      words_studied: number; total_correct: number; total_shown: number
    }>

    return {
      students: students.map(s => ({
        id: s.id,
        name: s.name,
        email: s.email,
        joinedAt: s.created_at,
        wordsStudied: s.words_studied ?? 0,
        totalCorrect: s.total_correct ?? 0,
        totalShown: s.total_shown ?? 0,
      }))
    }
  } catch (err: any) {
    throw createError({ statusCode: 500, message: err.message || 'Failed to fetch students' })
  }
})
