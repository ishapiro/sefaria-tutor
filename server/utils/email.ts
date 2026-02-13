import type { H3Event } from 'h3'
import { createError, getHeader } from 'h3'
import { useRuntimeConfig } from '#imports'

/**
 * Build site base URL. Prefers explicit baseUrl when provided and valid; otherwise from request or config.
 */
function getSiteUrl(event: H3Event, baseUrl?: string): string {
  if (baseUrl) {
    const normalized = baseUrl.replace(/\/$/, '')
    if (normalized) return normalized
  }
  const host =
    getHeader(event, 'x-forwarded-host') ||
    getHeader(event, 'host') ||
    ''
  if (host) {
    const proto =
      getHeader(event, 'x-forwarded-proto') ||
      (host.startsWith('localhost') || host.startsWith('127.0.0.1') ? 'http' : 'https')
    return `${proto}://${host}`.replace(/\/$/, '')
  }
  const config = useRuntimeConfig()
  const env = (globalThis as unknown as { process?: { env?: Record<string, string> } }).process?.env
  const siteUrl =
    ((config as any).public?.siteUrl as string | undefined) ||
    env?.NUXT_PUBLIC_SITE_URL ||
    'http://localhost:8787'
  return siteUrl.replace(/\/$/, '')
}

/**
 * Validate that a client-provided link base URL is safe to use (matches request origin or is localhost).
 */
export function validateLinkBaseUrl(event: H3Event, linkBaseUrl: unknown): string | null {
  if (typeof linkBaseUrl !== 'string' || !linkBaseUrl.trim()) return null
  let origin: string
  try {
    const u = new URL(linkBaseUrl.trim())
    origin = u.origin
  } catch {
    return null
  }
  const requestOrigin = getHeader(event, 'origin')
  let refererOrigin: string | null = null
  const referer = getHeader(event, 'referer')
  if (referer) {
    try {
      refererOrigin = new URL(referer).origin
    } catch {}
  }
  const allowed = [requestOrigin, refererOrigin].filter(Boolean)
  if (allowed.includes(origin)) return origin
  // Allow localhost / 127.0.0.1 for local dev (any port)
  if (/^https?:\/\/(localhost|127\.0\.0\.1)(:\d+)?$/i.test(origin)) return origin
  return null
}

export async function sendVerificationEmail(event: H3Event, email: string, token: string, linkBaseUrl?: string) {
  const config = useRuntimeConfig()
  const env = (globalThis as unknown as { process?: { env?: Record<string, string> } }).process?.env
  // Prefer runtimeConfig, then env vars (both Cloudflare-style and Nuxt-style)
  const resendApiKey =
    (config as any).resendApiKey || env?.NUXT_RESEND_API_KEY || env?.RESEND_API_KEY
  
  if (!resendApiKey) {
    console.error('RESEND_API_KEY / NUXT_RESEND_API_KEY is not set. Cannot send verification email.')
    throw createError({
      statusCode: 500,
      message: 'We could not send a verification email. Please contact support.',
      data: {
        debug: {
          provider: 'resend',
          reason: 'missing_api_key'
        }
      }
    })
  }

  const siteUrl = getSiteUrl(event, linkBaseUrl)
  const verificationUrl = `${siteUrl}/api/auth/verify?token=${encodeURIComponent(token)}`

  const response = await fetch('https://api.resend.com/emails', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${resendApiKey}`
    },
    body: JSON.stringify({
      from: 'Shoresh <noreply@shoresh.cogitations.com>', // Verified domain sender
      to: email,
      subject: 'Verify your email for Shoresh',
      html: `
        <h1>Welcome to Shoresh</h1>
        <p>Please click the link below to verify your email address and activate your account:</p>
        <a href="${verificationUrl}">${verificationUrl}</a>
        <p>This link will expire in 24 hours.</p>
      `
    })
  })

  if (!response.ok) {
    let errorBody: any = null
    try {
      errorBody = await response.json()
    } catch {}

    const safeDebug = {
      provider: 'resend',
      statusCode: errorBody?.statusCode ?? response.status,
      name: errorBody?.name ?? 'unknown_error',
      message: errorBody?.message ?? 'Email provider rejected the request.'
    }

    console.error('Failed to send email via Resend:', safeDebug)

    throw createError({
      statusCode: 500,
      message: 'We could not send a verification email. Please contact support and provide the debug details.',
      data: {
        debug: safeDebug
      }
    })
  }
}

/**
 * Send password reset email with a one-time link to the reset-password page.
 * Link expires in 1 hour (enforced by API when consuming the token).
 * Pass linkBaseUrl (e.g. from client window.location.origin) so the link matches where the user is running the app.
 */
export async function sendPasswordResetEmail(event: H3Event, email: string, token: string, linkBaseUrl?: string) {
  const config = useRuntimeConfig()
  const env = (globalThis as unknown as { process?: { env?: Record<string, string> } }).process?.env
  const resendApiKey =
    (config as any).resendApiKey || env?.NUXT_RESEND_API_KEY || env?.RESEND_API_KEY

  if (!resendApiKey) {
    console.error('RESEND_API_KEY / NUXT_RESEND_API_KEY is not set. Cannot send password reset email.')
    throw createError({
      statusCode: 500,
      message: 'We could not send a password reset email. Please contact support.',
      data: { debug: { provider: 'resend', reason: 'missing_api_key' } }
    })
  }

  const siteUrl = getSiteUrl(event, linkBaseUrl)
  const resetUrl = `${siteUrl}/reset-password?token=${encodeURIComponent(token)}`

  const response = await fetch('https://api.resend.com/emails', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${resendApiKey}`
    },
    body: JSON.stringify({
      from: 'Shoresh <noreply@shoresh.cogitations.com>',
      to: email,
      subject: 'Reset your Shoresh password',
      html: `
        <h1>Reset your password</h1>
        <p>You requested a password reset for your Shoresh account. Click the link below to choose a new password:</p>
        <a href="${resetUrl}">${resetUrl}</a>
        <p>This link will expire in 1 hour. If you did not request this, you can ignore this email.</p>
      `
    })
  })

  if (!response.ok) {
    let errorBody: any = null
    try {
      errorBody = await response.json()
    } catch {}
    const safeDebug = {
      provider: 'resend',
      statusCode: errorBody?.statusCode ?? response.status,
      name: errorBody?.name ?? 'unknown_error',
      message: errorBody?.message ?? 'Email provider rejected the request.'
    }
    console.error('Failed to send password reset email via Resend:', safeDebug)
    throw createError({
      statusCode: 500,
      message: 'We could not send a password reset email. Please try again or contact support.',
      data: { debug: safeDebug }
    })
  }
}
