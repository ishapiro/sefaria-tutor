import { defineEventHandler, createError, getRouterParam } from 'h3'
import { requireUserRole } from '~/server/utils/auth'
import { getR2Key } from '~/server/utils/pronunciation-cache'

export default defineEventHandler(async (event) => {
  await requireUserRole(event, ['admin'])

  const textHash = getRouterParam(event, 'hash')
  if (!textHash) {
    throw createError({
      statusCode: 400,
      message: 'Missing text hash parameter',
    })
  }

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
    // Get entry to find file size
    const entry = (await db
      .prepare('SELECT * FROM pronunciation_cache WHERE text_hash = ?')
      .bind(textHash)
      .first()) as { r2_key: string; file_size_bytes: number } | null

    if (!entry) {
      throw createError({
        statusCode: 404,
        message: 'Cache entry not found',
      })
    }

    // Delete from R2
    await r2Bucket.delete(entry.r2_key)

    // Delete from D1
    await db.prepare('DELETE FROM pronunciation_cache WHERE text_hash = ?').bind(textHash).run()

    // Update stats
    const now = Math.floor(Date.now() / 1000)
    const stats = (await db
      .prepare('SELECT total_size_bytes, total_files FROM pronunciation_cache_stats WHERE id = 1')
      .first()) as { total_size_bytes: number; total_files: number } | null

    if (stats) {
      const newTotalSize = Math.max(0, stats.total_size_bytes - entry.file_size_bytes)
      const newTotalFiles = Math.max(0, stats.total_files - 1)

      await db
        .prepare('UPDATE pronunciation_cache_stats SET total_size_bytes = ?, total_files = ?, updated_at = ? WHERE id = 1')
        .bind(newTotalSize, newTotalFiles, now)
        .run()
    }

    return {
      success: true,
      message: 'Entry deleted successfully',
    }
  } catch (err: any) {
    if (err.statusCode) {
      throw err
    }
    throw createError({
      statusCode: 500,
      message: err.message || 'Failed to delete entry',
    })
  }
})
