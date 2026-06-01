import { defineEventHandler, createError, getRouterParam, readBody } from 'h3'
import { requireUserRole } from '~/server/utils/auth'

export default defineEventHandler(async (event) => {
  const userData = await requireUserRole(event, ['general', 'team', 'admin'])

  // @ts-ignore
  const db = event.context.cloudflare?.env?.DB

  if (!db) {
    throw createError({ statusCode: 500, message: 'Database connection not available' })
  }

  if (!userData.id) {
    throw createError({ statusCode: 401, message: 'User not found' })
  }

  const id = getRouterParam(event, 'id')
  const listId = parseInt(id || '', 10)
  if (isNaN(listId)) {
    throw createError({ statusCode: 400, message: 'Invalid list ID' })
  }

  const body = await readBody(event).catch(() => ({}))
  if (body?.confirm !== true) {
    throw createError({ statusCode: 400, message: 'Deletion requires confirm: true in the request body' })
  }

  try {
    const existing = await db.prepare(
      'SELECT id FROM word_lists WHERE id = ? AND user_id = ?'
    ).bind(listId, userData.id).first()

    if (!existing) {
      throw createError({ statusCode: 404, message: 'List not found' })
    }

    // Count words before deletion for the response
    const countResult = await db.prepare(
      'SELECT COUNT(*) as total FROM user_word_list WHERE list_id = ? AND user_id = ?'
    ).bind(listId, userData.id).first() as { total: number } | null
    const deletedWords = countResult?.total ?? 0

    // Delete words in this list, then delete the list itself
    await db.prepare(
      'DELETE FROM user_word_list WHERE list_id = ? AND user_id = ?'
    ).bind(listId, userData.id).run()

    await db.prepare(
      'DELETE FROM word_lists WHERE id = ? AND user_id = ?'
    ).bind(listId, userData.id).run()

    return { success: true, deletedWords }
  } catch (err: any) {
    if (err.statusCode) throw err
    throw createError({ statusCode: 500, message: err.message || 'Failed to delete list' })
  }
})
