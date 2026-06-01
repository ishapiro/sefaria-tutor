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

  // Get current user's email for share lookup
  const userRow = await db.prepare('SELECT email FROM users WHERE id = ? AND deleted_at IS NULL')
    .bind(userData.id).first() as { email: string } | null

  try {
    // Own lists
    const { results: ownResults } = await db.prepare(`
      SELECT wl.id, wl.name, wl.created_at, wl.updated_at,
             COUNT(uwl.id) as word_count
      FROM word_lists wl
      LEFT JOIN user_word_list uwl
        ON uwl.list_id = wl.id AND uwl.archived_at IS NULL
      WHERE wl.user_id = ?
      GROUP BY wl.id
      ORDER BY wl.created_at ASC
    `).bind(userData.id).all()

    const ownLists = (ownResults || []) as Array<{
      id: number; name: string; created_at: number; updated_at: number; word_count: number
    }>

    // Lists shared with this user (matched by user_id or email), including permission
    const { results: sharedResults } = await db.prepare(`
      SELECT wl.id, wl.name, wl.created_at, wl.updated_at,
             COUNT(uwl.id) as word_count,
             u.email as owner_email, u.name as owner_name,
             wls.permission as shared_permission
      FROM word_list_shares wls
      JOIN word_lists wl ON wl.id = wls.list_id
      JOIN users u ON u.id = wl.user_id
      LEFT JOIN user_word_list uwl
        ON uwl.list_id = wl.id AND uwl.archived_at IS NULL
      WHERE (wls.shared_with_user_id = ? OR wls.shared_with_email = ?)
      GROUP BY wl.id
      ORDER BY wl.created_at ASC
    `).bind(userData.id, userRow?.email ?? '').all()

    const sharedLists = (sharedResults || []) as Array<{
      id: number; name: string; created_at: number; updated_at: number;
      word_count: number; owner_email: string; owner_name: string | null; shared_permission: string
    }>

    return {
      lists: [
        ...ownLists.map(l => ({
          id: l.id,
          name: l.name,
          createdAt: l.created_at,
          updatedAt: l.updated_at,
          wordCount: l.word_count,
          isShared: false,
          ownerEmail: null as string | null,
          ownerName: null as string | null,
          sharedPermission: null as 'read' | 'write' | null,
        })),
        ...sharedLists.map(l => ({
          id: l.id,
          name: l.name,
          createdAt: l.created_at,
          updatedAt: l.updated_at,
          wordCount: l.word_count,
          isShared: true,
          ownerEmail: l.owner_email,
          ownerName: l.owner_name,
          sharedPermission: l.shared_permission as 'read' | 'write',
        })),
      ]
    }
  } catch (err: any) {
    throw createError({ statusCode: 500, message: err.message || 'Failed to fetch word lists' })
  }
})
