import { defineEventHandler, createError, getRouterParam } from 'h3'
import { requireUserRole } from '~/server/utils/auth'

export default defineEventHandler(async (event) => {
  const userData = await requireUserRole(event, ['team', 'admin'])

  // @ts-ignore
  const db = event.context.cloudflare?.env?.DB
  if (!db) throw createError({ statusCode: 500, message: 'Database connection not available' })
  if (!userData.id) throw createError({ statusCode: 401, message: 'User not found' })

  const classId = getRouterParam(event, 'classId')
  if (!classId) throw createError({ statusCode: 400, message: 'classId is required' })

  const team = await db.prepare('SELECT id FROM teams WHERE id = ? AND leader_id = ?')
    .bind(classId, userData.id).first()
  if (!team) throw createError({ statusCode: 404, message: 'Class not found' })

  try {
    const { results } = await db.prepare(`
      SELECT cn.id as publication_id, cn.published_at,
             n.id, n.he_phrase, n.en_phrase, n.ref_display, n.sefaria_ref,
             n.book_title, n.book_path, n.note_text, n.created_at
      FROM class_notes cn
      JOIN user_notes n ON n.id = cn.note_id
      WHERE cn.team_id = ? AND cn.teacher_id = ?
      ORDER BY cn.published_at DESC
    `).bind(classId, userData.id).all()

    const notes = (results || []).map((r: any) => ({
      publicationId: r.publication_id,
      publishedAt: r.published_at,
      id: r.id,
      hePhrase: r.he_phrase,
      enPhrase: r.en_phrase,
      refDisplay: r.ref_display,
      sefariaRef: r.sefaria_ref,
      bookTitle: r.book_title ?? undefined,
      bookPath: r.book_path ?? undefined,
      noteText: r.note_text,
      createdAt: r.created_at,
    }))

    return { notes }
  } catch (err: any) {
    throw createError({ statusCode: 500, message: err.message || 'Failed to fetch class notes' })
  }
})
