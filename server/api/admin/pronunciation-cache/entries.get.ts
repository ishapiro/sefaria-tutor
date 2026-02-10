import { defineEventHandler, createError, getQuery } from 'h3'
import { requireUserRole } from '~/server/utils/auth'
import type { PronunciationCacheEntry } from '~/server/utils/pronunciation-cache'

export default defineEventHandler(async (event) => {
  await requireUserRole(event, ['admin'])

  // @ts-ignore
  const db = event.context.cloudflare?.env?.DB

  if (!db) {
    throw createError({
      statusCode: 500,
      message: 'Database connection not available',
    })
  }

  const query = getQuery(event)
  const limit = Math.min(parseInt(query.limit as string) || 50, 100)
  const offset = parseInt(query.offset as string) || 0
  const search = (query.search as string)?.trim()

  try {
    let sql = 'SELECT * FROM pronunciation_cache'
    const params: any[] = []

    if (search) {
      sql += ' WHERE normalized_text LIKE ? OR text_hash LIKE ?'
      params.push(`%${search}%`, `%${search}%`)
    }

    sql += ' ORDER BY last_accessed_at DESC LIMIT ? OFFSET ?'
    params.push(limit, offset)

    const { results } = await db.prepare(sql).bind(...params).all<PronunciationCacheEntry>()

    const countSql = search
      ? 'SELECT COUNT(*) as count FROM pronunciation_cache WHERE normalized_text LIKE ? OR text_hash LIKE ?'
      : 'SELECT COUNT(*) as count FROM pronunciation_cache'
    const countParams = search ? [`%${search}%`, `%${search}%`] : []
    const countResult = await db.prepare(countSql).bind(...countParams).first<{ count: number }>()

    return {
      entries: results || [],
      total: (countResult?.count as number) || 0,
      limit,
      offset,
    }
  } catch (err: any) {
    throw createError({
      statusCode: 500,
      message: err.message || 'Failed to fetch cache entries',
    })
  }
})
