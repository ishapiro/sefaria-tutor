import { defineEventHandler, createError, getRouterParam, getQuery } from 'h3'
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

  const { listId: listIdParam } = getQuery(event)
  const listId = listIdParam ? parseInt(String(listIdParam), 10) : null
  if (listIdParam && isNaN(listId!)) throw createError({ statusCode: 400, message: 'Invalid listId' })

  try {
    // Get all shared list IDs for this class (if no listId filter)
    let wordFilter = ''
    let wordBindArgs: unknown[] = []
    if (listId !== null) {
      wordFilter = 'AND uwl.list_id = ?'
      wordBindArgs = [listId]
    } else {
      // Only words from lists shared with this class
      wordFilter = `AND uwl.list_id IN (
        SELECT list_id FROM word_list_shares WHERE shared_with_team_id = ?
      )`
      wordBindArgs = [classId]
    }

    // Full matrix: every (student × word) pair
    const { results } = await db.prepare(`
      SELECT uwl.id as word_id, uwl.word_data, uwl.list_id,
             u.id  as student_id, u.name as student_name, u.email as student_email,
             wlp.times_shown, wlp.times_correct, wlp.attempts_until_first_correct
      FROM user_word_list uwl
      CROSS JOIN users u
      LEFT JOIN word_list_progress wlp
        ON wlp.word_list_id = uwl.id AND wlp.user_id = u.id
      WHERE u.team_id = ? AND u.deleted_at IS NULL
        ${wordFilter}
      ORDER BY u.name, uwl.created_at
    `).bind(classId, ...wordBindArgs).all()

    const rows = (results || []) as Array<{
      word_id: number; word_data: string; list_id: number | null
      student_id: string; student_name: string | null; student_email: string
      times_shown: number | null; times_correct: number | null; attempts_until_first_correct: number | null
    }>

    return {
      progress: rows.map(r => {
        let wordEntry: Record<string, unknown> = {}
        try { wordEntry = JSON.parse(r.word_data)?.wordEntry ?? {} } catch {}
        return {
          wordId: r.word_id,
          listId: r.list_id,
          word: wordEntry.word ?? null,
          wordTranslation: wordEntry.wordTranslation ?? null,
          studentId: r.student_id,
          studentName: r.student_name,
          studentEmail: r.student_email,
          timesShown: r.times_shown ?? 0,
          timesCorrect: r.times_correct ?? 0,
          attemptsUntilFirstCorrect: r.attempts_until_first_correct ?? null,
        }
      })
    }
  } catch (err: any) {
    throw createError({ statusCode: 500, message: err.message || 'Failed to fetch progress' })
  }
})
