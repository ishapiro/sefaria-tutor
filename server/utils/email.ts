export async function sendVerificationEmail(email: string, token: string) {
  const config = useRuntimeConfig()
  const env = (globalThis as unknown as { process?: { env?: Record<string, string> } }).process?.env
  const resendApiKey = (config as any).resendApiKey || env?.NUXT_RESEND_API_KEY
  
  if (!resendApiKey) {
    console.error('RESEND_API_KEY is not set. Cannot send verification email.')
    return
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
      from: 'Sefaria Tutor <onboarding@resend.dev>', // You should update this with your verified domain
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
    const error = await response.json()
    console.error('Failed to send email via Resend:', error)
    throw new Error('Failed to send verification email')
  }
}
