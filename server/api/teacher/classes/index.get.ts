import { defineEventHandler, createError } from 'h3'
import { requireUserRole } from '~/server/utils/auth'

export default defineEventHandler(async (event) => {
  const userData = await requireUserRole(event, ['team', 'admin'])

  // @ts-ignore
  const db = event.context.cloudflare?.env?.DB
  if (!db) throw createError({ statusCode: 500, message: 'Database connection not available' })
  if (!userData.id) throw createError({ statusCode: 401, message: 'User not found' })

  try {
    const { results } = await db.prepare(`
      SELECT t.id, t.name, t.invite_code, t.created_at,
             COUNT(u.id) as student_count
      FROM teams t
      LEFT JOIN users u ON u.team_id = t.id AND u.deleted_at IS NULL
      WHERE t.leader_id = ?
      GROUP BY t.id
      ORDER BY t.created_at ASC
    `).bind(userData.id).all()

    const classes = (results || []) as Array<{
      id: string; name: string; invite_code: string; created_at: number; student_count: number
    }>

    return {
      classes: classes.map(c => ({
        id: c.id,
        name: c.name,
        inviteCode: c.invite_code,
        createdAt: c.created_at,
        studentCount: c.student_count,
      }))
    }
  } catch (err: any) {
    throw createError({ statusCode: 500, message: err.message || 'Failed to fetch classes' })
  }
})
