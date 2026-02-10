import { defineEventHandler, createError } from 'h3'
import { requireUserRole } from '~/server/utils/auth'

export default defineEventHandler(async (event) => {
  await requireUserRole(event, ['admin'])

  // @ts-ignore
  const db = event.context.cloudflare?.env?.DB
  // @ts-ignore
  const r2Bucket = event.context.cloudflare?.env?.PRONUNCIATION_CACHE

  if (!db || !r2Bucket) {
    throw createError({
      statusCode: 500,
      message: 'Database or R2 bucket not available',
    })
  }

  try {
    // Get all entries
    const entries = (await db
      .prepare('SELECT r2_key FROM pronunciation_cache')
      .all()) as { results: { r2_key: string }[] }

    let deletedCount = 0
    let errors = 0

    // Delete all from R2
    for (const entry of entries.results || []) {
      try {
        await r2Bucket.delete(entry.r2_key)
        deletedCount++
      } catch (err) {
        console.error(`Error deleting R2 object ${entry.r2_key}:`, err)
        errors++
      }
    }

    // Clear D1 table
    await db.prepare('DELETE FROM pronunciation_cache').run()

    // Reset stats
    const now = Math.floor(Date.now() / 1000)
    await db
      .prepare('UPDATE pronunciation_cache_stats SET total_size_bytes = 0, total_files = 0, updated_at = ? WHERE id = 1')
      .bind(now)
      .run()

    return {
      success: true,
      deletedCount,
      errors,
      message: `Cleared ${deletedCount} entries${errors > 0 ? ` (${errors} errors)` : ''}`,
    }
  } catch (err: any) {
    throw createError({
      statusCode: 500,
      message: err.message || 'Failed to clear cache',
    })
  }
})
