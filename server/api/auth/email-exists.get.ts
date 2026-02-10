import { defineEventHandler, createError, getQuery } from 'h3'

export default defineEventHandler(async (event) => {
  const query = getQuery(event)
  const email = String(query.email || '').trim()

  if (!email) {
    throw createError({
      statusCode: 400,
      message: 'Email is required'
    })
  }

  // Basic email format check to avoid unnecessary DB lookups
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/
  if (!emailRegex.test(email)) {
    return { exists: false }
  }

  // @ts-ignore
  const db = event.context.cloudflare?.env?.DB
  if (!db) {
    throw createError({
      statusCode: 500,
      message: 'Database connection not available'
    })
  }

  const row = await db
    .prepare('SELECT id FROM users WHERE email = ? AND deleted_at IS NULL')
    .bind(email)
    .first<{ id: string } | null>()

  return { exists: Boolean(row) }
})

