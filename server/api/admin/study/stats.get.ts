import { defineEventHandler, createError } from 'h3'
import { requireUserRole } from '~/server/utils/auth'

export default defineEventHandler(async (event) => {
  await requireUserRole(event, ['admin'])

  // @ts-ignore
  const db = event.context.cloudflare?.env?.DB
  if (!db) {
    throw createError({
      statusCode: 500,
      message: 'Database connection not available'
    })
  }

  try {
    const agg = (await db
      .prepare(
        `SELECT
          COUNT(DISTINCT user_id) as distinct_users,
          COUNT(*) as total_progress_records,
          COALESCE(SUM(times_shown), 0) as total_times_shown,
          COALESCE(SUM(times_correct), 0) as total_times_correct
         FROM word_list_progress`
      )
      .first()) as {
      distinct_users: number
      total_progress_records: number
      total_times_shown: number
      total_times_correct: number
    } | null

    return {
      distinctUsers: agg?.distinct_users ?? 0,
      totalProgressRecords: agg?.total_progress_records ?? 0,
      totalTimesShown: agg?.total_times_shown ?? 0,
      totalTimesCorrect: agg?.total_times_correct ?? 0
    }
  } catch (err: any) {
    throw createError({
      statusCode: 500,
      message: err.message || 'Failed to fetch study stats'
    })
  }
})
