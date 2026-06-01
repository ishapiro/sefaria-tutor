import { defineEventHandler, createError } from 'h3'
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

  try {
    const { results } = await db.prepare(`
      SELECT wl.id, wl.name, wl.created_at, wl.updated_at,
             COUNT(uwl.id) as word_count
      FROM word_lists wl
      LEFT JOIN user_word_list uwl
        ON uwl.list_id = wl.id AND uwl.archived_at IS NULL
      WHERE wl.user_id = ?
      GROUP BY wl.id
      ORDER BY wl.created_at ASC
    `).bind(userData.id).all()

    const lists = (results || []) as Array<{
      id: number; name: string; created_at: number; updated_at: number; word_count: number
    }>

    return {
      lists: lists.map(l => ({
        id: l.id,
        name: l.name,
        createdAt: l.created_at,
        updatedAt: l.updated_at,
        wordCount: l.word_count,
      }))
    }
  } catch (err: any) {
    throw createError({ statusCode: 500, message: err.message || 'Failed to fetch word lists' })
  }
})
