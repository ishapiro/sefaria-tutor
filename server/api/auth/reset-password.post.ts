import { hashPasswordWorkers } from '../../utils/password'

/**
 * Reset password using a valid one-time token from the forgot-password email.
 * Token is invalidated after successful use.
 */
export default defineEventHandler(async (event) => {
  const body = await readBody(event)
  const token = typeof body?.token === 'string' ? body.token.trim() : ''
  const password = typeof body?.password === 'string' ? body.password : ''

  if (!token) {
    throw createError({
      statusCode: 400,
      message: 'Reset token is required'
    })
  }

  if (!password || password.length < 8) {
    throw createError({
      statusCode: 400,
      message: 'Password must be at least 8 characters'
    })
  }

  // Basic strength check (match registration: uppercase, lowercase, number)
  if (!/[a-z]/.test(password) || !/[A-Z]/.test(password) || !/[0-9]/.test(password)) {
    throw createError({
      statusCode: 400,
      message: 'Password must include uppercase, lowercase, and numbers'
    })
  }

  // @ts-ignore
  const db = event.context.cloudflare?.env?.DB
  if (!db) {
    throw createError({
      statusCode: 500,
      message: 'Database connection not available'
    })
  }

  const now = Math.floor(Date.now() / 1000)
  const user = (await db.prepare(
    'SELECT id FROM users WHERE password_reset_token = ? AND password_reset_expires_at > ? AND deleted_at IS NULL'
  )
    .bind(token, now)
    .first()) as { id: string } | null

  if (!user) {
    throw createError({
      statusCode: 400,
      message: 'Invalid or expired reset link. Please request a new password reset.'
    })
  }

  const passwordHash = await hashPasswordWorkers(password)

  await db.prepare(
    'UPDATE users SET password_hash = ?, password_reset_token = NULL, password_reset_expires_at = NULL WHERE id = ?'
  )
    .bind(passwordHash, user.id)
    .run()

  return {
    message: 'Your password has been reset. You can now sign in with your new password.'
  }
})
