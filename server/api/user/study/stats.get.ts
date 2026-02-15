import { defineEventHandler, createError } from 'h3'
import { requireUserRole } from '~/server/utils/auth'

export default defineEventHandler(async (event) => {
  const userData = await requireUserRole(event, ['general', 'team', 'admin'])

  if (!userData.id) {
    throw createError({
      statusCode: 401,
      message: 'User not found'
    })
  }

  // @ts-ignore
  const db = event.context.cloudflare?.env?.DB
  if (!db) {
    throw createError({
      statusCode: 500,
      message: 'Database connection not available'
    })
  }

  try {
    const summary = (await db
      .prepare(
        `SELECT
          COUNT(*) as words_studied,
          COALESCE(SUM(times_shown), 0) as total_shown,
          COALESCE(SUM(times_correct), 0) as total_correct
         FROM word_list_progress WHERE user_id = ?`
      )
      .bind(userData.id)
      .first()) as {
      words_studied: number
      total_shown: number
      total_correct: number
    } | null

    const rows = (await db
      .prepare(
        `SELECT
          p.word_list_id,
          p.times_shown,
          p.times_correct,
          p.attempts_until_first_correct,
          w.word_data,
          w.archived_at
         FROM word_list_progress p
         LEFT JOIN user_word_list w ON w.id = p.word_list_id AND w.user_id = p.user_id
         WHERE p.user_id = ?
         ORDER BY p.times_shown DESC`
      )
      .bind(userData.id)
      .all()) as {
      results: Array<{
        word_list_id: number
        times_shown: number
        times_correct: number
        attempts_until_first_correct: number | null
        word_data: string | null
        archived_at: number | null
      }>
    }

    const studiedWords = (rows.results || []).map((r) => {
      let wordData: unknown = null
      if (r.word_data) {
        try {
          wordData = JSON.parse(r.word_data)
        } catch {
          // keep null
        }
      }
      return {
        wordListId: r.word_list_id,
        wordData,
        archivedAt: r.archived_at ?? null,
        timesShown: r.times_shown,
        timesCorrect: r.times_correct,
        attemptsUntilFirstCorrect: r.attempts_until_first_correct ?? null
      }
    })

    return {
      summary: {
        wordsStudied: summary?.words_studied ?? 0,
        totalShown: summary?.total_shown ?? 0,
        totalCorrect: summary?.total_correct ?? 0
      },
      studiedWords
    }
  } catch (err: any) {
    throw createError({
      statusCode: 500,
      message: err.message || 'Failed to fetch study stats'
    })
  }
})
