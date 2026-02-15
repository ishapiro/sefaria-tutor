import { defineEventHandler, createError, getRouterParam } from 'h3'
import { requireUserRole } from '~/server/utils/auth'

export default defineEventHandler(async (event) => {
  const userData = await requireUserRole(event, ['general', 'team', 'admin'])

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
      message: 'Word list entry ID is required'
    })
  }

  const wordListId = parseInt(id, 10)
  if (isNaN(wordListId)) {
    throw createError({
      statusCode: 400,
      message: 'Invalid word list entry ID'
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
    const existing = await db.prepare(
      'SELECT id FROM user_word_list WHERE id = ? AND user_id = ?'
    )
      .bind(wordListId, userData.id)
      .first()

    if (!existing) {
      throw createError({
        statusCode: 404,
        message: 'Word not found or does not belong to you'
      })
    }

    await db.prepare(
      'DELETE FROM word_list_progress WHERE user_id = ? AND word_list_id = ?'
    )
      .bind(userData.id, wordListId)
      .run()

    return {
      success: true,
      message: 'Study stats reset for this word'
    }
  } catch (err: any) {
    if (err.statusCode) throw err
    throw createError({
      statusCode: 500,
      message: err.message || 'Failed to reset progress'
    })
  }
})
