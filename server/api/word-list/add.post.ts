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

  // Determine the effective owner whose list receives the word
  let effectiveOwnerId = userData.id
  if (resolvedListId !== null) {
    const listRow = await db.prepare('SELECT id, user_id FROM word_lists WHERE id = ?')
      .bind(resolvedListId).first() as { id: number; user_id: string } | null
    if (!listRow) throw createError({ statusCode: 404, message: 'Word list not found' })

    if (listRow.user_id !== userData.id) {
      // Check write share access
      const userRow = await db.prepare('SELECT email FROM users WHERE id = ? AND deleted_at IS NULL')
        .bind(userData.id).first() as { email: string } | null
      const shareRow = await db.prepare(
        `SELECT permission FROM word_list_shares
         WHERE list_id = ? AND permission = 'write'
           AND (shared_with_user_id = ? OR shared_with_email = ?)`
      ).bind(resolvedListId, userData.id, userRow?.email ?? '').first()
      if (!shareRow) throw createError({ statusCode: 403, message: 'You do not have write access to this list' })
      effectiveOwnerId = listRow.user_id
    }
  }

  try {
    const wordDataJson = JSON.stringify(wordData)
    const createdAt = Math.floor(Date.now() / 1000)

    const result = await db.prepare(
      'INSERT INTO user_word_list (user_id, word_data, created_at, list_id, added_by_user_id) VALUES (?, ?, ?, ?, ?) RETURNING id'
    )
      .bind(effectiveOwnerId, wordDataJson, createdAt, resolvedListId, userData.id)
      .first()

    if (!result || typeof result !== 'object' || !('id' in result)) {
      throw new Error('Failed to insert word')
    }

    // Bump updated_at on the named list
    if (resolvedListId !== null) {
      await db.prepare(
        'UPDATE word_lists SET updated_at = ? WHERE id = ?'
      ).bind(createdAt, resolvedListId).run()
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
