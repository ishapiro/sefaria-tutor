import { defineEventHandler } from 'h3'

export default defineEventHandler(async (event) => {
  const config = useRuntimeConfig(event)
  const env = (globalThis as unknown as { process?: { env?: Record<string, string> } }).process?.env

  const googleClientId = env?.NUXT_OAUTH_GOOGLE_CLIENT_ID || (config as any).oauth?.google?.clientId || ''
  const googleClientSecret = env?.NUXT_OAUTH_GOOGLE_CLIENT_SECRET || (config as any).oauth?.google?.clientSecret || ''
  const googleEnabled = Boolean(googleClientId && googleClientSecret)

  // In this app, email/password auth depends on DB availability (users table) and session config,
  // but we can at least report whether the D1 binding exists in the current runtime.
  // @ts-ignore
  const db = event.context.cloudflare?.env?.DB
  const emailEnabled = Boolean(db)

  return {
    googleEnabled,
    emailEnabled,
  }
})

