import { randomUUID } from 'uncrypto'
import { sendPasswordResetEmail, validateLinkBaseUrl } from '../../utils/email'

/**
 * Request a password reset for an email/password account.
 * Always returns the same success message to avoid revealing whether the email exists.
 * Only sends an email if the account exists and has a password (email-based auth).
 * Accepts optional linkBaseUrl (e.g. window.location.origin from client) so the email link matches where the user is running the app.
 */
export default defineEventHandler(async (event) => {
  const body = await readBody(event)
  const email = typeof body?.email === 'string' ? body.email.trim() : ''
  const linkBaseUrl = validateLinkBaseUrl(event, body?.linkBaseUrl) ?? undefined

  if (!email) {
    throw createError({
      statusCode: 400,
      message: 'Email is required'
    })
  }

  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/
  if (!emailRegex.test(email)) {
    throw createError({
      statusCode: 400,
      message: 'Please enter a valid email address'
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

  // Only consider users with a password (email-based accounts); exclude deleted
  const user = (await db.prepare(
    'SELECT id, email FROM users WHERE email = ? AND password_hash IS NOT NULL AND deleted_at IS NULL'
  )
    .bind(email)
    .first()) as { id: string; email: string } | null

  if (user) {
    const token = randomUUID()
    const expiresAt = Math.floor(Date.now() / 1000) + 60 * 60 // 1 hour

    await db.prepare(
      'UPDATE users SET password_reset_token = ?, password_reset_expires_at = ? WHERE id = ?'
    )
      .bind(token, expiresAt, user.id)
      .run()

    await sendPasswordResetEmail(event, user.email, token, linkBaseUrl)
  }

  // Same response whether or not the account existed (no email enumeration)
  return {
    message: 'If an account exists with that email, you will receive a password reset link shortly. Please check your inbox and spam folder.'
  }
})
