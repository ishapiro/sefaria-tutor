import { defineEventHandler, createError, readBody } from 'h3'
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

  const body = await readBody(event)
  const name = typeof body?.name === 'string' ? body.name.trim() : ''

  if (!name) {
    throw createError({ statusCode: 400, message: 'List name is required' })
  }

  if (name.length > 100) {
    throw createError({ statusCode: 400, message: 'List name must be 100 characters or fewer' })
  }

  const now = Math.floor(Date.now() / 1000)

  try {
    const result = await db.prepare(
      'INSERT INTO word_lists (user_id, name, created_at, updated_at) VALUES (?, ?, ?, ?) RETURNING id'
    ).bind(userData.id, name, now, now).first()

    if (!result || typeof result !== 'object' || !('id' in result)) {
      throw new Error('Failed to insert list')
    }

    return {
      id: (result as { id: number }).id,
      name,
      createdAt: now,
      updatedAt: now,
    }
  } catch (err: any) {
    throw createError({ statusCode: 500, message: err.message || 'Failed to create word list' })
  }
})
