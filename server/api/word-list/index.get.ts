import { defineEventHandler, createError } from 'h3'
import { requireUserRole } from '~/server/utils/auth'

export default defineEventHandler(async (event) => {
  // Require user to be logged in
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

  try {
    // Fetch all words for this user, ordered by newest first
    const { results } = await db.prepare(
      'SELECT id, word_data, created_at FROM user_word_list WHERE user_id = ? ORDER BY created_at DESC'
    )
      .bind(userData.id)
      .all()

    // Parse word_data JSON and structure the response
    const words = (results || []).map((row: any) => {
      let wordData
      try {
        wordData = JSON.parse(row.word_data)
      } catch (e) {
        // Skip invalid JSON entries
        return null
      }

      return {
        id: row.id,
        wordData,
        createdAt: row.created_at
      }
    }).filter(Boolean) // Remove null entries

    return {
      words,
      total: words.length
    }
  } catch (err: any) {
    throw createError({
      statusCode: 500,
      message: err.message || 'Failed to fetch word list'
    })
  }
})
