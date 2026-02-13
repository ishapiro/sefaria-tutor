import { defineEventHandler, createError } from 'h3'
import { validateAuth } from '~/server/utils/auth'

export default defineEventHandler(async (event) => {
  validateAuth(event)
  // @ts-ignore
  const db = event.context.cloudflare?.env?.DB

  if (!db) {
    throw createError({
      statusCode: 500,
      message: 'Database connection not available',
    })
  }

  try {
    const countResult = (await db.prepare('SELECT COUNT(*) as count FROM translation_cache').first()) as { count: number } | null
    const deletedCount = countResult?.count ?? 0

    await db.prepare('DELETE FROM translation_cache').run()

    const now = Math.floor(Date.now() / 1000)
    await db
      .prepare('UPDATE cache_stats SET hits = 0, misses = 0, malformed_hits = 0, updated_at = ? WHERE id = 1')
      .bind(now)
      .run()

    return {
      success: true,
      deletedCount,
      message: `Cleared ${deletedCount} translation cache entries and reset stats.`,
    }
  } catch (err: any) {
    throw createError({
      statusCode: 500,
      message: err.message || 'Failed to clear cache',
    })
  }
})
