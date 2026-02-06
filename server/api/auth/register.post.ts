import { randomUUID } from 'uncrypto'
import { sendVerificationEmail } from '../../utils/email'

export default defineEventHandler(async (event) => {
  const body = await readBody(event)
  const { email, password, name } = body

  if (!email || !password) {
    throw createError({
      statusCode: 400,
      message: 'Email and password are required'
    })
  }

  const db = hubDatabase()
  
  // Check if user already exists
  const existingUser = await db.prepare('SELECT id FROM users WHERE email = ?')
    .bind(email)
    .first()

  if (existingUser) {
    throw createError({
      statusCode: 409,
      message: 'An account with this email already exists'
    })
  }

  const userId = randomUUID()
  const hashedPassword = await hashPassword(password)
  const verificationToken = randomUUID()
  const tokenExpiresAt = Math.floor(Date.now() / 1000) + (24 * 60 * 60) // 24 hours

  // Create user in D1
  await db.prepare('INSERT INTO users (id, email, name, password_hash, verification_token, token_expires_at, role, is_verified) VALUES (?, ?, ?, ?, ?, ?, ?, ?)')
    .bind(userId, email, name, hashedPassword, verificationToken, tokenExpiresAt, 'general', 0)
    .run()

  // Send verification email
  await sendVerificationEmail(email, verificationToken)

  return {
    message: 'Registration successful. Please check your email for verification instructions.'
  }
})
