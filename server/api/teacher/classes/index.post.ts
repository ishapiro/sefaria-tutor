import { defineEventHandler, createError, readBody } from 'h3'
import { requireUserRole } from '~/server/utils/auth'
import { randomUUID } from 'uncrypto'

function generateInviteCode (): string {
  // 8-char alphanumeric, upper-case
  return Math.random().toString(36).substring(2, 6).toUpperCase() +
         Math.random().toString(36).substring(2, 6).toUpperCase()
}

export default defineEventHandler(async (event) => {
  const userData = await requireUserRole(event, ['team', 'admin'])

  // @ts-ignore
  const db = event.context.cloudflare?.env?.DB
  if (!db) throw createError({ statusCode: 500, message: 'Database connection not available' })
  if (!userData.id) throw createError({ statusCode: 401, message: 'User not found' })

  const body = await readBody(event)
  const name = typeof body?.name === 'string' ? body.name.trim() : ''
  if (!name) throw createError({ statusCode: 400, message: 'Class name is required' })
  if (name.length > 100) throw createError({ statusCode: 400, message: 'Name must be 100 characters or fewer' })

  const id = randomUUID()
  const inviteCode = generateInviteCode()
  const now = Math.floor(Date.now() / 1000)

  try {
    await db.prepare(
      'INSERT INTO teams (id, name, leader_id, invite_code, created_at) VALUES (?, ?, ?, ?, ?)'
    ).bind(id, name, userData.id, inviteCode, now).run()

    return { id, name, inviteCode, createdAt: now, studentCount: 0 }
  } catch (err: any) {
    throw createError({ statusCode: 500, message: err.message || 'Failed to create class' })
  }
})
