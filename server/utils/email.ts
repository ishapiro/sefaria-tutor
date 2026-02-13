import type { H3Event } from 'h3'
import { createError, getHeader } from 'h3'
import { useRuntimeConfig } from '#imports'

export async function sendVerificationEmail(event: H3Event, email: string, token: string) {
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

  // Prefer explicit config/env, but fall back to the current request host so emails from production
  // use the live domain instead of localhost.
  let siteUrl =
    ((config as any).public?.siteUrl as string | undefined) ||
    env?.NUXT_PUBLIC_SITE_URL

  if (!siteUrl) {
    const host =
      getHeader(event, 'x-forwarded-host') ||
      getHeader(event, 'host') ||
      'localhost:8787'

    const protoHeader = getHeader(event, 'x-forwarded-proto')
    const proto =
      protoHeader ||
      (host.startsWith('localhost') || host.startsWith('127.0.0.1') ? 'http' : 'https')

    siteUrl = `${proto}://${host}`
  }

  const verificationUrl = `${siteUrl.replace(/\/$/, '')}/api/auth/verify?token=${encodeURIComponent(token)}`

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
