# Safaria Word Explorer (Sefaria Tutor)

A web app for reading Jewish texts from [Sefaria](https://www.sefaria.org/) with AI-powered translation and text-to-speech. A product of [Cogitations](https://cogitations.com).

## Purpose

This application is designed to help students understand classical Jewish texts word by word as a way to build vocabulary and enhance their access to these texts. As a Hebrew school graduate with limited Hebrew depth, I developed it for my own study. It is provided free of charge.

Suggestions for improvements are welcome: [ishapiro@cogitations.com](mailto:ishapiro@cogitations.com)

## Architecture

| Layer | Tech |
|-------|------|
| **Frontend** | Nuxt 3, Vue 3, Tailwind CSS |
| **Server** | Nitro (Node-compatible) |
| **Deployment** | Cloudflare Workers + Workers Sites |

### API Routes

Server routes run on Nitro and are proxied in production on Cloudflare Workers:

| Route | Purpose |
|-------|---------|
| `GET /api/sefaria/*` | Proxies requests to the Sefaria API (texts, index) |
| `POST /api/openai/chat` | Translation via OpenAI Responses API |
| `GET /api/openai/model` | Fetches preferred OpenAI model (instant/mini/turbo) |
| `POST /api/openai/tts` | Text-to-speech via OpenAI Audio API |

The client sends a Bearer token (`NUXT_PUBLIC_API_AUTH_TOKEN`) for OpenAI routes; the server validates it against `API_AUTH_TOKEN` and forwards requests with `OPENAI_API_KEY`.

### Cloudflare Deployment

- **Nitro preset:** `cloudflare_module` — builds a Worker script + static assets.
- **Wrangler:** Uses `[site]` with `bucket = ".output/public"` so static files are served via Workers Sites and Nitro receives `__STATIC_CONTENT_MANIFEST`.
- **Entry:** `.output/server/index.mjs` handles both API and page rendering.

For detailed deployment steps (secrets, custom domain, troubleshooting), see [docs/DEPLOY-CLOUDFLARE.md](docs/DEPLOY-CLOUDFLARE.md).

## Quick start

```bash
cp .env.example .env
# Edit .env: set API_AUTH_TOKEN, OPENAI_API_KEY, NUXT_PUBLIC_API_AUTH_TOKEN
npm install
npm run dev
```

Open http://localhost:3000 — browse categories, select a book, select Hebrew text for translation, or click verse numbers for full-sentence translation.

## Environment

| Variable | Where | Purpose |
|----------|-------|---------|
| `API_AUTH_TOKEN` | Server | Validates Bearer token on OpenAI API routes |
| `OPENAI_API_KEY` | Server | Used to call OpenAI (chat, model, TTS) |
| `NUXT_PUBLIC_API_AUTH_TOKEN` | Client | Bearer token sent to `/api/openai/*`; use same value as `API_AUTH_TOKEN` |

- **Dev:** Copy `.env.example` to `.env` and set all three.
- **Wrangler preview:** Use `.dev.vars` with the same keys (do not commit).
- **Production:** Set secrets via `wrangler secret put` and `NUXT_PUBLIC_API_AUTH_TOKEN` in the Cloudflare dashboard (see [DEPLOY-CLOUDFLARE.md](docs/DEPLOY-CLOUDFLARE.md)).

## Build & deploy

```bash
npm run deploy
```

Or stepwise:

```bash
npm run build
npx wrangler deploy
```

Wrangler uploads the Worker and static assets. On success, the app is live at your Workers URL (e.g. `https://sefaria-tutor.<account>.workers.dev` or your custom domain).

## Local preview (production-like)

To run the built app locally with Wrangler:

```bash
npm run build
npx wrangler dev
```

Use `.dev.vars` for secrets. The app will be at http://localhost:8787.

## Source & license

- **Texts:** [Sefaria](https://www.sefaria.org/) — this application would not exist without Sefaria’s work. Please consider [donating to Sefaria](https://donate.sefaria.org/) to support their free access to Jewish texts.
- **Translation & TTS:** OpenAI
- **License:** MIT — [GitHub](https://github.com/ishapiro/sefaria-tutor)
