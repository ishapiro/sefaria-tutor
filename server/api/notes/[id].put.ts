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
      message: 'Note ID is required'
    })
  }

  const noteId = parseInt(id, 10)
  if (isNaN(noteId)) {
    throw createError({
      statusCode: 400,
      message: 'Invalid note ID'
    })
  }

  const body = await readBody(event)
  const noteText = typeof body?.noteText === 'string' ? body.noteText : ''

  try {
    const existing = await db.prepare(
      'SELECT id FROM user_notes WHERE id = ? AND user_id = ?'
    )
      .bind(noteId, userData.id)
      .first()

    if (!existing) {
      throw createError({
        statusCode: 404,
        message: 'Note not found or does not belong to you'
      })
    }

    await db.prepare(
      'UPDATE user_notes SET note_text = ? WHERE id = ? AND user_id = ?'
    )
      .bind(noteText, noteId, userData.id)
      .run()

    return {
      success: true,
      message: 'Note updated'
    }
  } catch (err: any) {
    if (err.statusCode) {
      throw err
    }
    throw createError({
      statusCode: 500,
      message: err.message || 'Failed to update note'
    })
  }
})
