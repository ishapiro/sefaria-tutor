import { defineEventHandler, createError, getQuery } from 'h3'
import { requireUserRole } from '~/server/utils/auth'

const DEFAULT_LIMIT = 100
const MAX_LIMIT = 200

export default defineEventHandler(async (event) => {
  const userData = await requireUserRole(event, ['general', 'team', 'admin'])

  // @ts-ignore
  const db = event.context.cloudflare?.env?.DB

  if (!db) {
    throw createError({
      statusCode: 500,
      message: 'Database connection not available'
    })
  }

  if (!userData.id) {
    throw createError({
      statusCode: 401,
      message: 'User not found'
    })
  }

  const query = getQuery(event)
  const limit = Math.min(
    Math.max(1, parseInt(String(query.limit || DEFAULT_LIMIT), 10) || DEFAULT_LIMIT),
    MAX_LIMIT
  )
  const offset = Math.max(0, parseInt(String(query.offset || 0), 10) || 0)
  const archivedOnly = String(query.archived || '').toLowerCase() === '1' || String(query.archived || '').toLowerCase() === 'true'

  const archiveFilter = archivedOnly
    ? 'AND archived_at IS NOT NULL'
    : 'AND archived_at IS NULL'
  const countSql = `SELECT COUNT(*) as total FROM user_word_list WHERE user_id = ? ${archiveFilter}`
  const listSql = `SELECT id, word_data, created_at, archived_at FROM user_word_list WHERE user_id = ? ${archiveFilter} ORDER BY created_at DESC LIMIT ? OFFSET ?`

  try {
    const countResult = await db.prepare(countSql)
      .bind(userData.id)
      .first()
    const total = (countResult as { total: number } | null)?.total ?? 0

    const { results } = await db.prepare(listSql)
      .bind(userData.id, limit, offset)
      .all()

    const rows = (results || []) as Array<{ id: number; word_data: string; created_at: number; archived_at: number | null }>
    const words: Array<{
      id: number
      wordData: unknown
      createdAt: number
      archivedAt: number | null
      progress?: { timesShown: number; timesCorrect: number; attemptsUntilFirstCorrect: number | null }
    }> = []

    let progressMap: Record<number, { times_shown: number; times_correct: number; attempts_until_first_correct: number | null }> = {}
    if (rows.length > 0) {
      const ids = rows.map(r => r.id)
      const placeholders = ids.map(() => '?').join(',')
      const progressResults = await db.prepare(
        `SELECT word_list_id, times_shown, times_correct, attempts_until_first_correct FROM word_list_progress WHERE user_id = ? AND word_list_id IN (${placeholders})`
      )
        .bind(userData.id, ...ids)
        .all()
      const progressRows = (progressResults.results || []) as Array<{ word_list_id: number; times_shown: number; times_correct: number; attempts_until_first_correct: number | null }>
      for (const p of progressRows) {
        progressMap[p.word_list_id] = {
          times_shown: p.times_shown,
          times_correct: p.times_correct,
          attempts_until_first_correct: p.attempts_until_first_correct
        }
      }
    }

    for (const row of rows) {
      let wordData: unknown
      try {
        wordData = JSON.parse(row.word_data)
      } catch (e) {
        continue
      }
      const progress = progressMap[row.id]
      words.push({
        id: row.id,
        wordData,
        createdAt: row.created_at,
        archivedAt: row.archived_at ?? null,
        ...(progress && {
          progress: {
            timesShown: progress.times_shown,
            timesCorrect: progress.times_correct,
            attemptsUntilFirstCorrect: progress.attempts_until_first_correct
          }
        })
      })
    }

    return {
      words,
      total,
      limit,
      offset
    }
  } catch (err: any) {
    throw createError({
      statusCode: 500,
      message: err.message || 'Failed to fetch word list'
    })
  }
})
