import { defineEventHandler, createError, getRouterParam, readBody } from 'h3'
import { requireUserRole } from '~/server/utils/auth'

export default defineEventHandler(async (event) => {
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

  let body: { archived?: boolean } = {}
  try {
    body = await readBody(event).catch(() => ({}))
  } catch {
    body = {}
  }
  const archived = body.archived === true
  const restore = body.archived === false

  if (!archived && !restore) {
    throw createError({
      statusCode: 400,
      message: 'Body must include "archived": true (archive) or "archived": false (restore)'
    })
  }

  try {
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

    const now = Math.floor(Date.now() / 1000)
    if (archived) {
      await db.prepare(
        'UPDATE user_word_list SET archived_at = ? WHERE id = ? AND user_id = ?'
      )
        .bind(now, wordId, userData.id)
        .run()
    } else {
      await db.prepare(
        'UPDATE user_word_list SET archived_at = NULL WHERE id = ? AND user_id = ?'
      )
        .bind(wordId, userData.id)
        .run()
    }

    return {
      success: true,
      message: archived ? 'Word archived' : 'Word restored to your list'
    }
  } catch (err: any) {
    if (err.statusCode) {
      throw err
    }
    throw createError({
      statusCode: 500,
      message: err.message || 'Failed to update word'
    })
  }
})
