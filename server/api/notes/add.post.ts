import { defineEventHandler, createError, readBody } from 'h3'
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

  const body = await readBody(event)
  const { hePhrase, enPhrase, refDisplay, sefariaRef, bookTitle, bookPath, noteText } = body

  if (typeof hePhrase !== 'string' || typeof refDisplay !== 'string' || typeof sefariaRef !== 'string') {
    throw createError({
      statusCode: 400,
      message: 'hePhrase, refDisplay, and sefariaRef are required.'
    })
  }

  const en = typeof enPhrase === 'string' ? enPhrase : ''
  const note = typeof noteText === 'string' ? noteText : ''
  const title = typeof bookTitle === 'string' ? bookTitle : null
  const path = typeof bookPath === 'string' ? bookPath : null
  const createdAt = Math.floor(Date.now() / 1000)

  try {
    const result = await db.prepare(
      'INSERT INTO user_notes (user_id, he_phrase, en_phrase, ref_display, sefaria_ref, book_title, book_path, note_text, created_at) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?) RETURNING id'
    )
      .bind(userData.id, hePhrase, en, refDisplay, sefariaRef, title, path, note, createdAt)
      .first()

    if (!result || typeof result !== 'object' || !('id' in result)) {
      throw new Error('Failed to insert note')
    }

    return {
      success: true,
      message: 'Note saved',
      noteId: (result as { id: number }).id
    }
  } catch (err: any) {
    throw createError({
      statusCode: 500,
      message: err.message || 'Failed to save note'
    })
  }
})
