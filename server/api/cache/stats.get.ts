import { defineEventHandler, createError } from 'h3'
import { validateAuth } from '~/server/utils/auth'

export default defineEventHandler(async (event) => {
  validateAuth(event)
  // @ts-ignore
  const db = event.context.cloudflare?.env?.DB

  if (!db) {
    throw createError({
      statusCode: 500,
      message: 'Database connection not available'
    })
  }

  try {
    const stats = await db.prepare('SELECT hits, misses, malformed_hits, updated_at FROM cache_stats WHERE id = 1').first()
    return stats || { hits: 0, misses: 0, malformed_hits: 0, updated_at: 0 }
  } catch (err: any) {
    throw createError({
      statusCode: 500,
      message: err.message
    })
  }
})
