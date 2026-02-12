import { defineEventHandler, createError, getRouterParam } from 'h3'
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

  const id = getRouterParam(event, 'id')
  if (!id) {
    throw createError({
      statusCode: 400,
      message: 'Word ID is required'
    })
  }

  const wordId = parseInt(id, 10)
  if (isNaN(wordId)) {
    throw createError({
      statusCode: 400,
      message: 'Invalid word ID'
    })
  }

  try {
    // First verify the word belongs to this user
    const existing = await db.prepare(
      'SELECT id FROM user_word_list WHERE id = ? AND user_id = ?'
    )
      .bind(wordId, userData.id)
      .first()

    if (!existing) {
      throw createError({
        statusCode: 404,
        message: 'Word not found or does not belong to you'
      })
    }

    // Delete the word
    await db.prepare(
      'DELETE FROM user_word_list WHERE id = ? AND user_id = ?'
    )
      .bind(wordId, userData.id)
      .run()

    return {
      success: true,
      message: 'Word removed from your list'
    }
  } catch (err: any) {
    if (err.statusCode) {
      throw err
    }

    throw createError({
      statusCode: 500,
      message: err.message || 'Failed to delete word'
    })
  }
})
