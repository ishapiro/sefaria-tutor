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
    // Get the user's team_id for class-share lookup
    const teamRow = await db.prepare('SELECT team_id FROM users WHERE id = ? AND deleted_at IS NULL')
      .bind(userData.id).first() as { team_id: string | null } | null
    const userTeamId = teamRow?.team_id ?? null

    // Individual shares
    const { results: sharedResults } = await db.prepare(`
      SELECT wl.id, wl.name, wl.created_at, wl.updated_at,
             COUNT(uwl.id) as word_count,
             u.email as owner_email, u.name as owner_name,
             wls.permission as shared_permission,
             0 as is_class_share
      FROM word_list_shares wls
      JOIN word_lists wl ON wl.id = wls.list_id
      JOIN users u ON u.id = wl.user_id
      LEFT JOIN user_word_list uwl
        ON uwl.list_id = wl.id AND uwl.archived_at IS NULL
      WHERE (wls.shared_with_user_id = ? OR wls.shared_with_email = ?)
        AND wls.shared_with_team_id IS NULL
      GROUP BY wl.id
      ORDER BY wl.created_at ASC
    `).bind(userData.id, userRow?.email ?? '').all()

    // Class shares (student is a member of the class that the list was shared with)
    const classSharedResults = userTeamId ? await db.prepare(`
      SELECT wl.id, wl.name, wl.created_at, wl.updated_at,
             COUNT(uwl.id) as word_count,
             u.email as owner_email, u.name as owner_name,
             'read' as shared_permission,
             1 as is_class_share
      FROM word_list_shares wls
      JOIN word_lists wl ON wl.id = wls.list_id
      JOIN users u ON u.id = wl.user_id
      LEFT JOIN user_word_list uwl
        ON uwl.list_id = wl.id AND uwl.archived_at IS NULL
      WHERE wls.shared_with_team_id = ?
      GROUP BY wl.id
      ORDER BY wl.created_at ASC
    `).bind(userTeamId).all() : { results: [] }

    type SharedRow = {
      id: number; name: string; created_at: number; updated_at: number;
      word_count: number; owner_email: string; owner_name: string | null;
      shared_permission: string; is_class_share: number
    }
    const sharedLists = ([...(sharedResults || []), ...(classSharedResults.results || [])]) as SharedRow[]

    // De-duplicate: if a list appears in both individual and class shares, keep the individual share
    const seen = new Set<number>()
    const deduped = sharedLists.filter(l => {
      if (seen.has(l.id)) return false
      seen.add(l.id)
      return true
    })

    return {
      lists: [
        ...ownLists.map(l => ({
          id: l.id,
          name: l.name,
          createdAt: l.created_at,
          updatedAt: l.updated_at,
          wordCount: l.word_count,
          isShared: false,
          isClassShared: false,
          ownerEmail: null as string | null,
          ownerName: null as string | null,
          sharedPermission: null as 'read' | 'write' | null,
        })),
        ...deduped.map(l => ({
          id: l.id,
          name: l.name,
          createdAt: l.created_at,
          updatedAt: l.updated_at,
          wordCount: l.word_count,
          isShared: true,
          isClassShared: l.is_class_share === 1,
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
