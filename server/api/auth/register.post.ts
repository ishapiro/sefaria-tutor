import { createError, getHeader } from 'h3'
import { randomUUID } from 'uncrypto'
import { sendVerificationEmail } from '../../utils/email'
import { hashPasswordWorkers } from '../../utils/password'

export default defineEventHandler(async (event) => {
  const body = await readBody(event)
  const { email, password, name, turnstileToken } = body

  if (!email || !password) {
    throw createError({
      statusCode: 400,
      message: 'Email and password are required'
    })
  }

  // Validate email format
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/
  if (!emailRegex.test(email)) {
    throw createError({
      statusCode: 400,
      message: 'Please enter a valid email address'
    })
  }

  // Verify Turnstile CAPTCHA
  if (turnstileToken) {
    const config = useRuntimeConfig(event)
    const env = (globalThis as unknown as { process?: { env?: Record<string, string> } }).process?.env
    const secretKey = config.turnstileSecretKey || env?.TURNSTILE_SECRET_KEY || ''
    
    if (secretKey) {
      try {
        const verifyResponse = await $fetch<{ success: boolean; 'error-codes'?: string[] }>(
          'https://challenges.cloudflare.com/turnstile/v0/siteverify',
          {
            method: 'POST',
            body: {
              secret: secretKey,
              response: turnstileToken,
              remoteip: getHeader(event, 'cf-connecting-ip') || getHeader(event, 'x-forwarded-for') || ''
            }
          }
        )
        
        if (!verifyResponse.success) {
          throw createError({
            statusCode: 400,
            message: 'CAPTCHA verification failed. Please try again.'
          })
        }
      } catch (err: any) {
        if (err.statusCode) throw err
        throw createError({
          statusCode: 400,
          message: 'CAPTCHA verification failed. Please try again.'
        })
      }
    }
  }

  // @ts-ignore
  const db = event.context.cloudflare?.env?.DB
  if (!db) {
    throw createError({
      statusCode: 500,
      message: 'Database connection not available'
    })
  }
  
  // Check if user already exists (only non-deleted users)
  const existingUser = await db.prepare('SELECT id FROM users WHERE email = ? AND deleted_at IS NULL')
    .bind(email)
    .first()

  if (existingUser) {
    throw createError({
      statusCode: 409,
      message: 'An account with this email already exists'
    })
  }

  const userId = randomUUID()
  const hashedPassword = await hashPasswordWorkers(password)
  const verificationToken = randomUUID()
  const tokenExpiresAt = Math.floor(Date.now() / 1000) + (24 * 60 * 60) // 24 hours
  const userName = name || email.split('@')[0] // Default to email prefix if name not provided

  // Create user in D1
  await db.prepare('INSERT INTO users (id, email, name, password_hash, verification_token, token_expires_at, role, is_verified) VALUES (?, ?, ?, ?, ?, ?, ?, ?)')
    .bind(userId, email, userName, hashedPassword, verificationToken, tokenExpiresAt, 'general', 0)
    .run()

  // Send verification email
  await sendVerificationEmail(event, email, verificationToken)

  return {
    message: 'Registration successful. Please check your email for verification instructions.'
  }
})
