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
        ${emailDoNotReplyFooter(siteUrl)}
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
        ${emailDoNotReplyFooter(siteUrl)}
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

export type SupportTicketForEmail = {
  id: string
  email: string
  page_url: string | null
  reference?: string | null
  type_bug: number
  type_suggestion: number
  type_help: number
  description: string
  status: string
  created_at: number
}

function getResendConfig(event: H3Event) {
  const config = useRuntimeConfig(event)
  const env = (globalThis as unknown as { process?: { env?: Record<string, string> } }).process?.env
  const resendApiKey =
    (config as any).resendApiKey || env?.NUXT_RESEND_API_KEY || env?.RESEND_API_KEY
  if (!resendApiKey) return null
  const siteUrl = getSiteUrl(event)
  return { resendApiKey, siteUrl }
}

async function sendResendEmail(apiKey: string, to: string, subject: string, html: string) {
  const response = await fetch('https://api.resend.com/emails', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${apiKey}`
    },
    body: JSON.stringify({
      from: 'Shoresh <noreply@shoresh.cogitations.com>',
      to,
      subject,
      html
    })
  })
  if (!response.ok) {
    let errorBody: any = null
    try {
      errorBody = await response.json()
    } catch {}
    throw new Error(errorBody?.message ?? `Resend rejected: ${response.status}`)
  }
}

function formatTicketTypes(ticket: SupportTicketForEmail): string {
  const types: string[] = []
  if (ticket.type_bug) types.push('Bug')
  if (ticket.type_suggestion) types.push('Suggestion')
  if (ticket.type_help) types.push('Help')
  return types.length ? types.join(', ') : 'General'
}

/**
 * Send new ticket notifications to shoresh@cogitations.com and to the user.
 */
export async function sendNewTicketNotification(event: H3Event, ticket: SupportTicketForEmail) {
  const cfg = getResendConfig(event)
  if (!cfg) {
    console.warn('RESEND_API_KEY not set. Skipping support ticket email notifications.')
    return
  }
  const { resendApiKey, siteUrl } = cfg
  const typesStr = formatTicketTypes(ticket)
  const adminUrl = `${siteUrl}/admin`
  const dateStr = new Date(ticket.created_at * 1000).toLocaleString()

  const adminHtml = `
    <h1>New Support Ticket #${ticket.id.slice(0, 8)}</h1>
    <p><strong>From:</strong> ${escapeHtml(ticket.email)}</p>
    <p><strong>Page:</strong> ${escapeHtml(ticket.page_url || 'N/A')}</p>
    <p><strong>Reference:</strong> ${escapeHtml(ticket.reference || 'N/A')}</p>
    <p><strong>Type:</strong> ${escapeHtml(typesStr)}</p>
    <p><strong>Status:</strong> ${escapeHtml(ticket.status)}</p>
    <p><strong>Created:</strong> ${escapeHtml(dateStr)}</p>
    <h2>Description</h2>
    <p>${escapeHtml(ticket.description).replace(/\n/g, '<br>')}</p>
    <p><a href="${adminUrl}">View in Admin Panel</a></p>
    ${emailDoNotReplyFooter(siteUrl)}
  `

  const userHtml = `
    <h1>Support Ticket Received</h1>
    <p>We have received your support request (ticket #${ticket.id.slice(0, 8)}).</p>
    <p>Someone will respond shortly.</p>
    <p><a href="${siteUrl}">Go to Shoresh</a></p>
    <p>You will need to log in to see your tickets, then click <strong>Support</strong> in the top navigation and choose Existing tickets.</p>
    ${emailDoNotReplyFooter(siteUrl)}
  `

  await sendResendEmail(
    resendApiKey,
    'shoresh@cogitations.com',
    `[Shoresh] New ticket #${ticket.id.slice(0, 8)} from ${ticket.email}`,
    adminHtml
  )
  await sendResendEmail(
    resendApiKey,
    ticket.email,
    'Your Shoresh support ticket has been received',
    userHtml
  )
}

/**
 * Send ticket update notification to the user (reply or status change).
 */
export async function sendTicketUpdateNotification(
  event: H3Event,
  ticket: SupportTicketForEmail,
  options: { replyText?: string; newStatus?: string }
) {
  const cfg = getResendConfig(event)
  if (!cfg) {
    console.warn('RESEND_API_KEY not set. Skipping support ticket update email.')
    return
  }
  const { resendApiKey, siteUrl } = cfg
  const ticketShort = ticket.id.slice(0, 8)

  let body = ''
  if (options.replyText) {
    body += `<h2>New reply</h2><p>${escapeHtml(options.replyText).replace(/\n/g, '<br>')}</p>`
  }
  if (options.newStatus) {
    body += `<p><strong>Status:</strong> ${escapeHtml(options.newStatus)}</p>`
  }
  body += `<p><a href="${siteUrl}">View your tickets in Shoresh</a></p><p>You will need to log in to see your tickets, then click <strong>Support</strong> in the top navigation and choose Existing tickets.</p>`

  const html = `
    <h1>Support Ticket #${ticketShort} Updated</h1>
    <p>Your support ticket has been updated.</p>
    ${body}
    ${emailDoNotReplyFooter(siteUrl)}
  `

  await sendResendEmail(
    resendApiKey,
    ticket.email,
    `Your Shoresh support ticket #${ticketShort} has been updated`,
    html
  )
}

function escapeHtml(s: string): string {
  return s
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#039;')
}

/** Footer for all outgoing emails: do not reply; use the app to add comments. */
function emailDoNotReplyFooter(siteUrl: string): string {
  return `
    <p style="margin-top: 1.5em; font-size: 0.9em; color: #666;">
      Please do not reply to this email. Use the <a href="${escapeHtml(siteUrl)}">app</a> or website to add additional comments or follow up.
    </p>
  `
}
