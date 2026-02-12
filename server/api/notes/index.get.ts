import { defineEventHandler, createError, getQuery } from 'h3'
import { requireUserRole } from '~/server/utils/auth'

const DEFAULT_LIMIT = 100
const MAX_LIMIT = 200

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

  const query = getQuery(event)
  const limit = Math.min(
    Math.max(1, parseInt(String(query.limit || DEFAULT_LIMIT), 10) || DEFAULT_LIMIT),
    MAX_LIMIT
  )
  const offset = Math.max(0, parseInt(String(query.offset || 0), 10) || 0)

  try {
    const countResult = await db.prepare(
      'SELECT COUNT(*) as total FROM user_notes WHERE user_id = ?'
    )
      .bind(userData.id)
      .first()
    const total = (countResult as { total: number } | null)?.total ?? 0

    const { results } = await db.prepare(
      'SELECT id, he_phrase, en_phrase, ref_display, sefaria_ref, book_title, book_path, note_text, created_at FROM user_notes WHERE user_id = ? ORDER BY created_at DESC LIMIT ? OFFSET ?'
    )
      .bind(userData.id, limit, offset)
      .all()

    const notes = (results || []).map((row: any) => ({
      id: row.id,
      hePhrase: row.he_phrase,
      enPhrase: row.en_phrase,
      refDisplay: row.ref_display,
      sefariaRef: row.sefaria_ref,
      bookTitle: row.book_title ?? undefined,
      bookPath: row.book_path ?? undefined,
      noteText: row.note_text,
      createdAt: row.created_at
    }))

    return {
      notes,
      total,
      limit,
      offset
    }
  } catch (err: any) {
    throw createError({
      statusCode: 500,
      message: err.message || 'Failed to fetch notes'
    })
  }
})
