# Deploy Shoresh to Cloudflare Workers

The app is configured for Cloudflare (Nitro preset `cloudflare_module`). Follow these steps to deploy.

## 1. Prerequisites

- Node.js 18+
- A [Cloudflare account](https://dash.cloudflare.com/sign-up)
- Wrangler as a dev dependency (`npx wrangler` works after `npm install`)
- A D1 Database named `sefaria-tutor-db` (see Step 2)

## 2. Database and Schema

Create the D1 database:

```bash
npx wrangler d1 create sefaria-tutor-db
```

Update your `wrangler.toml` with the `database_id` provided by the command above. Then apply the schema migrations:

```bash
# Apply to local (for testing)
npx wrangler d1 execute sefaria-tutor-db --local --file=migrations/0001_initial_schema.sql
# ... apply other migrations in order ...

# Apply to production
npx wrangler d1 execute sefaria-tutor-db --remote --file=migrations/0001_initial_schema.sql --yes
```

## 3. Build and deploy

From the project root, build then deploy:

```bash
npm run build
npx wrangler deploy
```

Or in one step:

```bash
npm run deploy
```

The root **`wrangler.toml`** points to `.output/server/index.mjs` (worker entry) and `.output/public` (static assets via `[site]`). The `[site]` section is required so Wrangler injects `__STATIC_CONTENT_MANIFEST`, which the Nitro Cloudflare preset expects—do not switch to `[assets]` unless you change the Nitro preset.

**First time:** Wrangler may prompt you to log in (`npx wrangler login`) and to create a new Worker. Accept the defaults if you want a `*.workers.dev` subdomain.

On success, Wrangler prints the live URL (e.g. `https://shoresh.<your-subdomain>.workers.dev`).

## 3. Set secrets (required for translation)

The app needs these in production:

| Name | Purpose |
|------|--------|
| `API_AUTH_TOKEN` | Server checks this against the Bearer token the client sends to `/api/openai/chat`. |
| `OPENAI_API_KEY` | Server uses this to call the OpenAI API. |
| `NUXT_PUBLIC_API_AUTH_TOKEN` | Client sends this as Bearer token; set to the same value as `API_AUTH_TOKEN` (or use an env var in the dashboard). |

### Option A – Wrangler secrets (recommended)

Run from the project root. Wrangler will prompt you to enter each value:

```bash
npx wrangler secret put API_AUTH_TOKEN
npx wrangler secret put OPENAI_API_KEY
```

For the client token, use either:

- **Dashboard (plain env var):** Left sidebar **Build** → **Compute & AI** (or [Workers & Pages](https://dash.cloudflare.com/?to=/:account/workers-and-pages)) → **Overview** → click **shoresh** → **Settings** → **Variables and Secrets** → **Add** → **Text**, name `NUXT_PUBLIC_API_AUTH_TOKEN`, value = same as `API_AUTH_TOKEN` → **Deploy**.
- **Build-time:** set `NUXT_PUBLIC_API_AUTH_TOKEN` in your environment when running `npm run build` (only if you need it baked into the client bundle).

### Option B – Set secrets from `.env` (non-interactive)

If you have a `.env` file with the same variable names:

```bash
source .env
echo "$API_AUTH_TOKEN" | npx wrangler secret put API_AUTH_TOKEN
echo "$OPENAI_API_KEY" | npx wrangler secret put OPENAI_API_KEY
```

Then add `NUXT_PUBLIC_API_AUTH_TOKEN` in the dashboard (Workers & Pages → your worker → **Settings** → **Variables and Secrets** → **Add** → **Text**) as in Option A.

### Option C – Dashboard only

1. In the Cloudflare dashboard left sidebar: **Build** → **Compute & AI** (Workers and Pages live here). Or open [Workers & Pages](https://dash.cloudflare.com/?to=/:account/workers-and-pages) directly.
2. Under **Overview**, click your **shoresh** worker.
3. Go to **Settings** → **Variables and Secrets** → **Add**.
4. Add **Secret** (encrypted): name `API_AUTH_TOKEN`, then value. Repeat for `OPENAI_API_KEY`.
5. Add **Text** (plaintext env var): name `NUXT_PUBLIC_API_AUTH_TOKEN`, value = same as `API_AUTH_TOKEN`.
6. Click **Deploy** so the Worker picks up the new variables and secrets.

If **Variables and Secrets** isn’t visible, check under the worker’s **Settings** tab; the exact label may vary with dashboard updates (see [Environment variables](https://developers.cloudflare.com/workers/configuration/environment-variables/#add-environment-variables-via-the-dashboard)).

## 4. Custom domain (optional)

1. **Workers & Pages** → **shoresh** → **Settings** → **Domains & Routes**.
2. **Add** → **Custom domain** (e.g. `shoresh.yourdomain.com`).
3. Follow the DNS instructions (usually a CNAME to your worker).

## 5. Local preview

To run the built app locally with Wrangler:

```bash
npm run build
npx wrangler dev
```

Wrangler reads `wrangler.toml` (main and `[site]` bucket). For secrets in local dev, create a **`.dev.vars`** file in the project root with the same keys as `.env` (see `.env.example`). Do not commit `.dev.vars`.

Example `.dev.vars`:

```
API_AUTH_TOKEN=your-auth-token
OPENAI_API_KEY=your-openai-api-key
NUXT_PUBLIC_API_AUTH_TOKEN=your-auth-token
```

## 6. Troubleshooting

- **“Missing entry-point to Worker script”**  
  Run **`npm run build`** first so `.output/` exists. Run `npx wrangler deploy` from the project root so it uses the root `wrangler.toml`.

- **“No such module __STATIC_CONTENT_MANIFEST”**  
  The config must use **`[site]`** with `bucket = ".output/public"`, not `[assets]`. The Nitro Cloudflare preset expects the legacy Workers Sites manifest.

- **500 “Server configuration error”**  
  The Worker cannot see `OPENAI_API_KEY`. Set it with `npx wrangler secret put OPENAI_API_KEY` or as an encrypted secret in the dashboard.

- **401 on translation**  
  The client must send the same token the server expects. Set `NUXT_PUBLIC_API_AUTH_TOKEN` (dashboard or build-time) to the same value as `API_AUTH_TOKEN`.

- **Warnings about `workers_dev` or `preview_urls`**  
  You can set `workers_dev = false` or `preview_urls = false` in `wrangler.toml` if you want to disable the default `*.workers.dev` or Preview URLs behavior.
