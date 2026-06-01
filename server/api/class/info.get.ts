import { defineEventHandler, createError } from 'h3'
import { requireUserRole } from '~/server/utils/auth'

export default defineEventHandler(async (event) => {
  const userData = await requireUserRole(event, ['general', 'team', 'admin'])

  // @ts-ignore
  const db = event.context.cloudflare?.env?.DB
  if (!db) throw createError({ statusCode: 500, message: 'Database connection not available' })
  if (!userData.id) throw createError({ statusCode: 401, message: 'User not found' })

  const userRow = await db.prepare('SELECT team_id FROM users WHERE id = ? AND deleted_at IS NULL')
    .bind(userData.id).first() as { team_id: string | null } | null

  if (!userRow?.team_id) return { enrolled: false, teamId: null, teamName: null }

  const team = await db.prepare('SELECT id, name FROM teams WHERE id = ?')
    .bind(userRow.team_id).first() as { id: string; name: string } | null

  if (!team) return { enrolled: false, teamId: null, teamName: null }

  return { enrolled: true, teamId: team.id, teamName: team.name }
})
