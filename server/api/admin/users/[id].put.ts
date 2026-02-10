import { defineEventHandler, createError, getRouterParam, readBody } from 'h3'
import { requireUserRole } from '~/server/utils/auth'

export default defineEventHandler(async (event) => {
  // Require admin role
  await requireUserRole(event, ['admin'])

  const userId = getRouterParam(event, 'id')
  if (!userId) {
    throw createError({
      statusCode: 400,
      message: 'User ID is required'
    })
  }

  const body = await readBody<{
    name?: string | null
    email?: string
    role?: string
    is_verified?: boolean
  }>(event)

  // @ts-ignore
  const db = event.context.cloudflare?.env?.DB

  if (!db) {
    throw createError({
      statusCode: 500,
      message: 'Database connection not available'
    })
  }

  try {
    // Build update query dynamically based on provided fields
    const updates: string[] = []
    const values: unknown[] = []

    if (body.name !== undefined) {
      updates.push('name = ?')
      values.push(body.name)
    }
    if (body.email !== undefined) {
      updates.push('email = ?')
      values.push(body.email)
    }
    if (body.role !== undefined) {
      if (!['general', 'team', 'admin'].includes(body.role)) {
        throw createError({
          statusCode: 400,
          message: 'Invalid role. Must be general, team, or admin'
        })
      }
      updates.push('role = ?')
      values.push(body.role)
    }
    if (body.is_verified !== undefined) {
      updates.push('is_verified = ?')
      values.push(body.is_verified ? 1 : 0)
    }

    if (updates.length === 0) {
      throw createError({
        statusCode: 400,
        message: 'No fields to update'
      })
    }

    values.push(userId)

    const query = `UPDATE users SET ${updates.join(', ')} WHERE id = ?`
    await db.prepare(query).bind(...values).run()

    // Fetch and return updated user
    const updatedUser = await db.prepare('SELECT id, email, name, role, is_verified FROM users WHERE id = ?')
      .bind(userId)
      .first<{ id: string; email: string; name: string | null; role: string; is_verified: boolean }>()

    return updatedUser
  } catch (err: any) {
    if (err.statusCode) {
      throw err
    }
    throw createError({
      statusCode: 500,
      message: err.message || 'Failed to update user'
    })
  }
})
