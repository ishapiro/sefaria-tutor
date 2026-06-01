import { defineEventHandler, createError, readBody } from 'h3'
import { requireUserRole } from '~/server/utils/auth'

export default defineEventHandler(async (event) => {
  // Require user to be logged in with 'general' role or higher
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

  const body = await readBody(event)
  const { wordData, listId } = body

  if (!wordData || !wordData.wordEntry) {
    throw createError({
      statusCode: 400,
      message: 'Invalid word data. wordData.wordEntry is required.'
    })
  }

  // Validate that wordEntry has at least word or wordTranslation
  if (!wordData.wordEntry.word && !wordData.wordEntry.wordTranslation) {
    throw createError({
      statusCode: 400,
      message: 'Word entry must have at least word or wordTranslation'
    })
  }

  // Validate listId if provided
  const resolvedListId: number | null = (typeof listId === 'number' && Number.isInteger(listId)) ? listId : null

  if (resolvedListId !== null) {
    const listRow = await db.prepare(
      'SELECT id FROM word_lists WHERE id = ? AND user_id = ?'
    ).bind(resolvedListId, userData.id).first()
    if (!listRow) {
      throw createError({ statusCode: 404, message: 'Word list not found' })
    }
  }

  try {
    const wordDataJson = JSON.stringify(wordData)
    const createdAt = Math.floor(Date.now() / 1000)

    const result = await db.prepare(
      'INSERT INTO user_word_list (user_id, word_data, created_at, list_id) VALUES (?, ?, ?, ?) RETURNING id'
    )
      .bind(userData.id, wordDataJson, createdAt, resolvedListId)
      .first()

    if (!result || typeof result !== 'object' || !('id' in result)) {
      throw new Error('Failed to insert word')
    }

    // Bump updated_at on the named list
    if (resolvedListId !== null) {
      await db.prepare(
        'UPDATE word_lists SET updated_at = ? WHERE id = ? AND user_id = ?'
      ).bind(createdAt, resolvedListId, userData.id).run()
    }

    return {
      success: true,
      message: 'Word added to your list',
      wordId: (result as { id: number }).id
    }
  } catch (err: any) {
    if (err.message?.includes('UNIQUE constraint') || err.message?.includes('duplicate')) {
      throw createError({
        statusCode: 409,
        message: 'Word already exists in your list'
      })
    }

    throw createError({
      statusCode: 500,
      message: err.message || 'Failed to add word to list'
    })
  }
})
