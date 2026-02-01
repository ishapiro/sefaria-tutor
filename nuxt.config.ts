// https://nuxt.com/docs/api/configuration/nuxt-config
export default defineNuxtConfig({
  compatibilityDate: '2024-09-19',
  devtools: { enabled: true },
  modules: ['@nuxtjs/tailwindcss'],
  nitro: {
    preset: 'cloudflare_module',
    cloudflare: {
      deployConfig: true,
      nodeCompat: true,
    },
  },
  runtimeConfig: {
    apiAuthToken: '',
    openaiApiKey: '',
    public: {
      appName: 'Sefaria Tutor',
      apiAuthToken: '', // Client sends this to /api/openai/chat (set NUXT_PUBLIC_API_AUTH_TOKEN in .env)
    },
  },
})
