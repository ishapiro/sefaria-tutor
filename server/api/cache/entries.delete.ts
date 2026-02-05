import { defineEventHandler, createError, getQuery } from 'h3'
import { validateAuth } from '../../utils/auth'

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

  const query = getQuery(event)
  const hash = query.hash as string

  if (!hash) {
    throw createError({
      statusCode: 400,
      message: 'Missing hash in query parameters'
    })
  }

  try {
    await db.prepare('DELETE FROM translation_cache WHERE phrase_hash = ?')
      .bind(hash)
      .run()
    
    return { success: true }
  } catch (err: any) {
    throw createError({
      statusCode: 500,
      message: err.message
    })
  }
})
