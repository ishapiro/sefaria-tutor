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
  const archivedOnly = String(query.archived || '').toLowerCase() === '1' || String(query.archived || '').toLowerCase() === 'true'

  // listId: absent or "default" → null list (implicit default); number → named list
  const listIdParam = query.listId
  let listFilter: string
  let listBindArgs: unknown[]
  let resolvedListId: number | null = null

  if (listIdParam !== undefined && listIdParam !== 'default' && listIdParam !== '') {
    const parsedListId = parseInt(String(listIdParam), 10)
    if (!isNaN(parsedListId)) {
      resolvedListId = parsedListId
      listFilter = 'AND list_id = ?'
      listBindArgs = [parsedListId]
    } else {
      listFilter = 'AND list_id IS NULL'
      listBindArgs = []
    }
  } else {
    listFilter = 'AND list_id IS NULL'
    listBindArgs = []
  }

  const archiveFilter = archivedOnly
    ? 'AND archived_at IS NOT NULL'
    : 'AND archived_at IS NULL'

  // For named lists, check if the current user owns OR has a share for the list
  // For the default (null) list, only the owner's words are shown
  let effectiveUserId = userData.id
  if (resolvedListId !== null) {
    const ownership = await db.prepare(
      'SELECT user_id FROM word_lists WHERE id = ?'
    ).bind(resolvedListId).first() as { user_id: string } | null

    if (!ownership) {
      throw createError({ statusCode: 404, message: 'List not found' })
    }

    if (ownership.user_id !== userData.id) {
      // Check share access by user_id or email
      const userRow = await db.prepare('SELECT email FROM users WHERE id = ? AND deleted_at IS NULL')
        .bind(userData.id).first() as { email: string } | null
      const shareRow = await db.prepare(
        'SELECT id FROM word_list_shares WHERE list_id = ? AND (shared_with_user_id = ? OR shared_with_email = ?)'
      ).bind(resolvedListId, userData.id, userRow?.email ?? '').first()

      if (!shareRow) {
        throw createError({ statusCode: 403, message: 'You do not have access to this list' })
      }
      // Query words using the owner's user_id
      effectiveUserId = ownership.user_id
    }
  }

  const countSql = `SELECT COUNT(*) as total FROM user_word_list WHERE user_id = ? ${listFilter} ${archiveFilter}`
  const listSql = `
    SELECT uwl.id, uwl.word_data, uwl.created_at, uwl.archived_at,
           uwl.added_by_user_id,
           u.name as added_by_name, u.email as added_by_email
    FROM user_word_list uwl
    LEFT JOIN users u ON u.id = uwl.added_by_user_id AND u.deleted_at IS NULL
    WHERE uwl.user_id = ? ${listFilter} ${archiveFilter}
    ORDER BY uwl.created_at DESC LIMIT ? OFFSET ?`

  try {
    const countResult = await db.prepare(countSql)
      .bind(effectiveUserId, ...listBindArgs)
      .first()
    const total = (countResult as { total: number } | null)?.total ?? 0

    const { results } = await db.prepare(listSql)
      .bind(effectiveUserId, ...listBindArgs, limit, offset)
      .all()

    const rows = (results || []) as Array<{
      id: number; word_data: string; created_at: number; archived_at: number | null
      added_by_user_id: string | null; added_by_name: string | null; added_by_email: string | null
    }>
    const words: Array<{
      id: number
      wordData: unknown
      createdAt: number
      archivedAt: number | null
      addedBy: { userId: string; name: string | null; email: string } | null
      progress?: { timesShown: number; timesCorrect: number; attemptsUntilFirstCorrect: number | null }
    }> = []

    let progressMap: Record<number, { times_shown: number; times_correct: number; attempts_until_first_correct: number | null }> = {}
    if (rows.length > 0) {
      const ids = rows.map(r => r.id)
      const placeholders = ids.map(() => '?').join(',')
      const progressResults = await db.prepare(
        `SELECT word_list_id, times_shown, times_correct, attempts_until_first_correct FROM word_list_progress WHERE user_id = ? AND word_list_id IN (${placeholders})`
      )
        .bind(userData.id, ...ids)
        .all()
      const progressRows = (progressResults.results || []) as Array<{ word_list_id: number; times_shown: number; times_correct: number; attempts_until_first_correct: number | null }>
      for (const p of progressRows) {
        progressMap[p.word_list_id] = {
          times_shown: p.times_shown,
          times_correct: p.times_correct,
          attempts_until_first_correct: p.attempts_until_first_correct
        }
      }
    }

    for (const row of rows) {
      let wordData: unknown
      try {
        wordData = JSON.parse(row.word_data)
      } catch (e) {
        continue
      }
      const progress = progressMap[row.id]
      words.push({
        id: row.id,
        wordData,
        createdAt: row.created_at,
        archivedAt: row.archived_at ?? null,
        addedBy: row.added_by_user_id && row.added_by_email
          ? { userId: row.added_by_user_id, name: row.added_by_name, email: row.added_by_email }
          : null,
        ...(progress && {
          progress: {
            timesShown: progress.times_shown,
            timesCorrect: progress.times_correct,
            attemptsUntilFirstCorrect: progress.attempts_until_first_correct
          }
        })
      })
    }

    return {
      words,
      total,
      limit,
      offset
    }
  } catch (err: any) {
    throw createError({
      statusCode: 500,
      message: err.message || 'Failed to fetch word list'
    })
  }
})
