import { defineEventHandler, createError, readBody } from 'h3'
import { requireUserRole } from '~/server/utils/auth'

export default defineEventHandler(async (event) => {
  const userData = await requireUserRole(event, ['general', 'team', 'admin'])

  // @ts-ignore
  const db = event.context.cloudflare?.env?.DB
  if (!db) throw createError({ statusCode: 500, message: 'Database connection not available' })
  if (!userData.id) throw createError({ statusCode: 401, message: 'User not found' })

  const body = await readBody(event)
  const inviteCode = typeof body?.inviteCode === 'string' ? body.inviteCode.trim() : ''
  if (!inviteCode) throw createError({ statusCode: 400, message: 'inviteCode is required' })

  const team = await db.prepare(
    'SELECT id, name FROM teams WHERE invite_code = ?'
  ).bind(inviteCode).first() as { id: string; name: string } | null

  if (!team) throw createError({ statusCode: 404, message: 'Invalid invite code' })

  await db.prepare('UPDATE users SET team_id = ? WHERE id = ?')
    .bind(team.id, userData.id).run()

  // Refresh session so teamId is immediately available on the client
  const { user: sessionUser } = await getUserSession(event)
  await setUserSession(event, { user: { ...(sessionUser as object), teamId: team.id } })

  return { success: true, teamId: team.id, teamName: team.name }
})
