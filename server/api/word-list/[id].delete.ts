import { defineEventHandler, createError, getRouterParam } from 'h3'
import { requireUserRole } from '~/server/utils/auth'

export default defineEventHandler(async (event) => {
  const userData = await requireUserRole(event, ['general', 'team', 'admin'])

  // @ts-ignore
  const db = event.context.cloudflare?.env?.DB
  if (!db) throw createError({ statusCode: 500, message: 'Database connection not available' })
  if (!userData.id) throw createError({ statusCode: 401, message: 'User not found' })

  const id = getRouterParam(event, 'id')
  const wordId = parseInt(id || '', 10)
  if (isNaN(wordId)) throw createError({ statusCode: 400, message: 'Invalid word ID' })

  try {
    const existing = await db.prepare(
      'SELECT id, user_id, list_id FROM user_word_list WHERE id = ?'
    ).bind(wordId).first() as { id: number; user_id: string; list_id: number | null } | null

    if (!existing) throw createError({ statusCode: 404, message: 'Word not found' })

    // Owner can always delete; a write-share user can also delete
    if (existing.user_id !== userData.id) {
      const userRow = await db.prepare('SELECT email FROM users WHERE id = ? AND deleted_at IS NULL')
        .bind(userData.id).first() as { email: string } | null
      const shareRow = existing.list_id ? await db.prepare(
        `SELECT id FROM word_list_shares WHERE list_id = ? AND permission = 'write'
           AND (shared_with_user_id = ? OR shared_with_email = ?)`
      ).bind(existing.list_id, userData.id, userRow?.email ?? '').first() : null
      if (!shareRow) throw createError({ statusCode: 403, message: 'You do not have write access to this list' })
    }

    await db.prepare('DELETE FROM user_word_list WHERE id = ?').bind(wordId).run()

    return { success: true, message: 'Word removed from your list' }
  } catch (err: any) {
    if (err.statusCode) throw err
    throw createError({ statusCode: 500, message: err.message || 'Failed to delete word' })
  }
})
