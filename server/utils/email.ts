import { createError } from 'h3'
import { useRuntimeConfig } from '#imports'

export async function sendVerificationEmail(email: string, token: string) {
  const config = useRuntimeConfig()
  const env = (globalThis as unknown as { process?: { env?: Record<string, string> } }).process?.env
  // Prefer runtimeConfig, then env vars (both Cloudflare-style and Nuxt-style)
  const resendApiKey =
    (config as any).resendApiKey ||
    env?.NUXT_RESEND_API_KEY ||
    env?.RESEND_API_KEY
  
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

  const siteUrl = ((config as any).public?.siteUrl as string) || env?.NUXT_PUBLIC_SITE_URL || 'http://localhost:8787'
  const verificationUrl = `${siteUrl.replace(/\/$/, '')}/api/auth/verify?token=${encodeURIComponent(token)}`

  const response = await fetch('https://api.resend.com/emails', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${resendApiKey}`
    },
    body: JSON.stringify({
      from: 'Sefaria Tutor <noreply@sefaria-tutor.cogitations.com>', // Verified domain sender
      to: email,
      subject: 'Verify your email for Sefaria Tutor',
      html: `
        <h1>Welcome to Sefaria Tutor</h1>
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
