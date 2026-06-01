import { defineEventHandler, createError } from 'h3'
import { requireUserRole } from '~/server/utils/auth'

export default defineEventHandler(async (event) => {
  const userData = await requireUserRole(event, ['general', 'team', 'admin'])

  // @ts-ignore
  const db = event.context.cloudflare?.env?.DB
  if (!db) throw createError({ statusCode: 500, message: 'Database connection not available' })
  if (!userData.id) throw createError({ statusCode: 401, message: 'User not found' })

  await db.prepare('UPDATE users SET team_id = NULL WHERE id = ?')
    .bind(userData.id).run()

  const { user: sessionUser } = await getUserSession(event)
  await setUserSession(event, { user: { ...(sessionUser as object), teamId: null } })

  return { success: true }
})
