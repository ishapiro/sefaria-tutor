// https://nuxt.com/docs/api/configuration/nuxt-config
export default defineNuxtConfig({
  compatibilityDate: '2024-09-19',
  devtools: { enabled: true },
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
    public: {
      appName: 'Shoresh',
      version: '1.0.0',
      apiAuthToken: '', // Client sends this to /api/openai/chat (set NUXT_PUBLIC_API_AUTH_TOKEN in .env)
      siteUrl: '',
      turnstileSiteKey: '', // Client-side site key for Turnstile widget (set NUXT_PUBLIC_TURNSTILE_SITE_KEY in .env)
    },
  },
})
