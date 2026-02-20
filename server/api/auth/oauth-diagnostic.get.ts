/**
 * Dev-only diagnostic for OAuth redirect URL and env. Helps debug Google login
 * when it works on one machine (e.g. Mac) but not another (e.g. WSL).
 * Call: GET /api/auth/oauth-diagnostic
 * Returns safe, non-secret info about redirect URL and request host.
 */
import { defineEventHandler, getHeader } from 'h3'

export default defineEventHandler((event) => {
  const env = (globalThis as unknown as { process?: { env?: Record<string, string> } }).process?.env
  // Wrangler injects .dev.vars into Cloudflare env; Nitro may expose as process.env or only on context
  const cloudflareEnv = (event.context as any).cloudflare?.env as Record<string, string> | undefined

  const fromProcess = env?.NUXT_OAUTH_GOOGLE_REDIRECT_URL ?? '(not set)'
  const fromCloudflare = cloudflareEnv?.NUXT_OAUTH_GOOGLE_REDIRECT_URL ?? '(not set)'
  const redirectUrl = fromProcess !== '(not set)' ? fromProcess : fromCloudflare !== '(not set)' ? fromCloudflare : null

  const host = getHeader(event, 'host') ?? '(none)'
  const origin = getHeader(event, 'origin') ?? '(none)'

  // Detect trailing CR/LF (common when .dev.vars was edited on Windows/WSL and has CRLF)
  let length = 0
  let lastCharCode: number | null = null
  let firstCharCode: number | null = null
  if (redirectUrl && redirectUrl !== '(not set)') {
    length = redirectUrl.length
    firstCharCode = redirectUrl.charCodeAt(0)
    lastCharCode = redirectUrl.charCodeAt(length - 1)
  }

  return {
    redirectUrl: redirectUrl === '(not set)' ? null : redirectUrl,
    redirectUrlSource: fromProcess !== '(not set)' ? 'process.env' : fromCloudflare !== '(not set)' ? 'cloudflare.env' : 'none',
    redirectUrlLength: length,
    redirectUrlFirstCharCode: firstCharCode,
    redirectUrlLastCharCode: lastCharCode,
    hint: lastCharCode === 13 ? 'Trailing CR (\\r) detected - remove Windows line endings from .dev.vars (use LF only)' : null,
    requestHost: host,
    requestOrigin: origin,
    expectedRedirectUri: host ? `http://${host}/api/auth/google` : null,
  }
})
