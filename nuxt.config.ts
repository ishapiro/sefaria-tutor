// https://nuxt.com/docs/api/configuration/nuxt-config
export default defineNuxtConfig({
  compatibilityDate: '2024-09-19',
  devtools: { enabled: true },
  app: {
    head: {
      link: [
        { rel: 'preconnect', href: 'https://fonts.googleapis.com' },
        { rel: 'preconnect', href: 'https://fonts.gstatic.com', crossorigin: '' },
        { rel: 'stylesheet', href: 'https://fonts.googleapis.com/css2?family=Source+Serif+4:ital,opsz,wght@0,8..60,200..900;1,8..60,200..900&display=swap' },
      ],
    },
  },
  modules: [
    '@nuxtjs/tailwindcss',
    '@nuxthub/core',
    'nuxt-auth-utils'
  ],
  hub: {
    database: true,
  },
  nitro: {
    preset: 'cloudflare_module',
    cloudflare: {
      deployConfig: false, // We use wrangler.toml directly, so no need for Nitro to generate wrangler.json
      nodeCompat: true,
    },
  },
  runtimeConfig: {
    apiAuthToken: '',
    openaiApiKey: '',
    resendApiKey: '',
    turnstileSecretKey: '', // Server-side secret for Turnstile verification
    // Session cookie lasts 30 days so users stay logged in across browser sessions (nuxt-auth-utils)
    session: {
      maxAge: 60 * 60 * 24 * 30, // 30 days, in seconds
    },
    public: {
      appName: 'Shoresh',
      version: '1.0.0',
      apiAuthToken: '', // Client sends this to /api/openai/chat (set NUXT_PUBLIC_API_AUTH_TOKEN in .env)
      siteUrl: '',
      turnstileSiteKey: '', // Client-side site key for Turnstile widget (set NUXT_PUBLIC_TURNSTILE_SITE_KEY in .env)
    },
  },
})
