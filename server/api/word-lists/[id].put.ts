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

  const body = await readBody(event)
  const name = typeof body?.name === 'string' ? body.name.trim() : ''

  if (!name) {
    throw createError({ statusCode: 400, message: 'List name is required' })
  }

  if (name.length > 100) {
    throw createError({ statusCode: 400, message: 'List name must be 100 characters or fewer' })
  }

  try {
    const existing = await db.prepare(
      'SELECT id FROM word_lists WHERE id = ? AND user_id = ?'
    ).bind(listId, userData.id).first()

    if (!existing) {
      throw createError({ statusCode: 404, message: 'List not found' })
    }

    const now = Math.floor(Date.now() / 1000)
    await db.prepare(
      'UPDATE word_lists SET name = ?, updated_at = ? WHERE id = ? AND user_id = ?'
    ).bind(name, now, listId, userData.id).run()

    return { success: true }
  } catch (err: any) {
    if (err.statusCode) throw err
    throw createError({ statusCode: 500, message: err.message || 'Failed to rename list' })
  }
})
