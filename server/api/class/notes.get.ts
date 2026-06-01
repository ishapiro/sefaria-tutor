import { defineEventHandler, createError } from 'h3'
import { requireUserRole } from '~/server/utils/auth'

export default defineEventHandler(async (event) => {
  const userData = await requireUserRole(event, ['general', 'team', 'admin'])

  // @ts-ignore
  const db = event.context.cloudflare?.env?.DB
  if (!db) throw createError({ statusCode: 500, message: 'Database connection not available' })
  if (!userData.id) throw createError({ statusCode: 401, message: 'User not found' })

  const userRow = await db.prepare('SELECT team_id FROM users WHERE id = ? AND deleted_at IS NULL')
    .bind(userData.id).first() as { team_id: string | null } | null

  if (!userRow?.team_id) return { notes: [] }

  try {
    const { results } = await db.prepare(`
      SELECT n.id, n.he_phrase, n.en_phrase, n.ref_display, n.sefaria_ref,
             n.book_title, n.book_path, n.note_text, n.created_at,
             u.name as teacher_name, u.email as teacher_email,
             cn.published_at
      FROM class_notes cn
      JOIN user_notes n ON n.id = cn.note_id
      JOIN users u ON u.id = cn.teacher_id
      WHERE cn.team_id = ?
      ORDER BY cn.published_at DESC
    `).bind(userRow.team_id).all()

    const notes = (results || []).map((r: any) => ({
      id: r.id,
      hePhrase: r.he_phrase,
      enPhrase: r.en_phrase,
      refDisplay: r.ref_display,
      sefariaRef: r.sefaria_ref,
      bookTitle: r.book_title ?? undefined,
      bookPath: r.book_path ?? undefined,
      noteText: r.note_text,
      createdAt: r.created_at,
      publishedAt: r.published_at,
      teacherName: r.teacher_name,
      teacherEmail: r.teacher_email,
    }))

    return { notes }
  } catch (err: any) {
    throw createError({ statusCode: 500, message: err.message || 'Failed to fetch class notes' })
  }
})
