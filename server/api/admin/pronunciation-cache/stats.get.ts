import { defineEventHandler, createError } from 'h3'
import { requireUserRole } from '~/server/utils/auth'
import { getCacheStats, getMaxCacheSizeBytes } from '~/server/utils/pronunciation-cache'

export default defineEventHandler(async (event) => {
  await requireUserRole(event, ['admin'])

  // @ts-ignore
  const db = event.context.cloudflare?.env?.DB

  if (!db) {
    throw createError({
      statusCode: 500,
      message: 'Database connection not available',
    })
  }

  try {
    const stats = await getCacheStats(db)
    const maxSizeBytes = getMaxCacheSizeBytes()

    if (!stats) {
      return {
        total_size_bytes: 0,
        total_files: 0,
        hits: 0,
        misses: 0,
        hit_rate: 0,
        max_size_bytes: maxSizeBytes,
        usage_percent: 0,
        last_purge_at: null,
        updated_at: 0,
      }
    }

    const totalRequests = stats.hits + stats.misses
    const hitRate = totalRequests > 0 ? stats.hits / totalRequests : 0
    const usagePercent = maxSizeBytes > 0 ? (stats.total_size_bytes / maxSizeBytes) * 100 : 0

    return {
      ...stats,
      hit_rate: Math.round(hitRate * 10000) / 100, // Percentage with 2 decimal places
      max_size_bytes: maxSizeBytes,
      usage_percent: Math.round(usagePercent * 100) / 100, // Percentage with 2 decimal places
    }
  } catch (err: any) {
    throw createError({
      statusCode: 500,
      message: err.message || 'Failed to fetch cache stats',
    })
  }
})
