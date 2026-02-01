# Sefaria Tutor

Nuxt 3 + Tailwind + Cloudflare Workers. Native Vue + Tailwind (no PrimeVue). Sefaria API and OpenAI translation proxied via Nitro server routes.

## Quick start

```bash
cp .env.example .env
# Edit .env: set API_AUTH_TOKEN, OPENAI_API_KEY, NUXT_PUBLIC_API_AUTH_TOKEN
npm install
npm run dev
```

Open http://localhost:3000 — browse categories, select a book, select Hebrew text to get word-by-word translation.

## Environment

- **Dev:** Copy `.env.example` to `.env`. Set:
  - `API_AUTH_TOKEN` / `OPENAI_API_KEY` (server)
  - `NUXT_PUBLIC_API_AUTH_TOKEN` (client; same value for Bearer token to `/api/openai/chat`)
- **Wrangler preview:** Copy same vars to `.dev.vars` (do not commit).
- **Production:** Set secrets in Cloudflare: `wrangler secret put API_AUTH_TOKEN`, `wrangler secret put OPENAI_API_KEY`; set `NUXT_PUBLIC_API_AUTH_TOKEN` in Workers env if the client needs it at runtime.

## Build & deploy

```bash
npm run build
npx wrangler deploy
```

Or use the command Nitro prints after build (e.g. `npx wrangler dev .output/server/index.mjs --site .output/public` for local preview with `.dev.vars`).

## Local testing

- **Dev server:** `npm run dev` → http://localhost:3000
- **Production-like (Wrangler):** `npm run build` then `npx wrangler dev .output/server/index.mjs --site .output/public` → http://localhost:8787 (use `.dev.vars` for secrets)

Source texts: [Sefaria](https://www.sefaria.org/).
