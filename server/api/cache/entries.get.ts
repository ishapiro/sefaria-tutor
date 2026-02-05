import { defineEventHandler, createError, getQuery } from 'h3'
import { validateAuth } from '../../utils/auth'

export default defineEventHandler(async (event) => {
  validateAuth(event)
  // @ts-ignore
  const db = event.context.cloudflare?.env?.DB

  if (!db) {
    throw createError({
      statusCode: 500,
      message: 'Database connection not available'
    })
  }

  const query = getQuery(event)
  const limit = Math.min(parseInt(query.limit as string) || 50, 100)
  const offset = parseInt(query.offset as string) || 0
  const search = query.search as string

  try {
    let sql = 'SELECT phrase_hash, phrase, response, created_at, version, prompt_hash FROM translation_cache'
    const params: any[] = []

    if (search) {
      sql += ' WHERE phrase LIKE ? OR phrase_hash LIKE ?'
      params.push(`%${search}%`, `%${search}%`)
    }

    sql += ' ORDER BY created_at DESC LIMIT ? OFFSET ?'
    params.push(limit, offset)

    const { results } = await db.prepare(sql).bind(...params).all()
    
    // Process results to include a snippet of the translation
    const entries = results.map((row: any) => {
      let translationSnippet = ''
      try {
        const parsed = JSON.parse(row.response)
        // The project returns the full OpenAI response. 
        // Based on chat.post.ts, the content is in output[0].content[0].text
        const content = parsed.output?.[0]?.content?.[0]?.text || ''
        if (content) {
            try {
                const innerParsed = JSON.parse(content)
                translationSnippet = innerParsed.translatedPhrase || ''
            } catch (e) {
                translationSnippet = content.substring(0, 100)
            }
        }
      } catch (e) {
        translationSnippet = 'Error parsing response'
      }

      return {
        phrase_hash: row.phrase_hash,
        phrase: row.phrase,
        translationSnippet,
        created_at: row.created_at,
        version: row.version,
        prompt_hash: row.prompt_hash
      }
    })

    const countSql = 'SELECT COUNT(*) as count FROM translation_cache' + (search ? ' WHERE phrase LIKE ? OR phrase_hash LIKE ?' : '')
    const countParams = search ? [`%${search}%`, `%${search}%`] : []
    const countResult = await db.prepare(countSql).bind(...countParams).first<{ count: number }>()

    return {
      entries,
      total: countResult?.count || 0,
      limit,
      offset
    }
  } catch (err: any) {
    throw createError({
      statusCode: 500,
      message: err.message
    })
  }
})
