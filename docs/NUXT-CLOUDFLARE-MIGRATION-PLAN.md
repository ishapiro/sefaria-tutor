# Sefaria Tutor → Nuxt + Tailwind on Cloudflare

**Last updated:** January 2025 — aligned with current Nuxt, Tailwind, and Cloudflare docs.

This plan uses the **latest recommended** setup for Nuxt + Tailwind on Cloudflare (Workers with Static Assets). It does **not** use PrimeVue; the UI is built with native Vue and Tailwind only.

---

## 1. Current Architecture (Summary)

- **Frontend:** Vite + Vue 3 + PrimeVue + Tailwind. Single SPA: `App.vue`, `CategoryAccordion.vue`.
- **Sefaria API:** Cloudflare Worker `sefaria-proxy-worker` at `.../proxy/api/...` forwards to `https://www.sefaria.org`.
- **OpenAI API:** Cloudflare Worker `openai-proxy-worker` validates Bearer token and forwards to OpenAI.
- **Deploy:** Static `dist` to Cloudflare Pages; two separate Workers for the proxies.

---

## 2. Target Architecture

- **Single Nuxt app** on **Cloudflare Workers** (Nitro preset `cloudflare_module` — Workers with Static Assets).
- **No separate Workers:** Sefaria and OpenAI proxying live inside the same app as **Nitro server API routes**.
- **Stack:** Nuxt 3/4, Vue 3, Tailwind only (no PrimeVue).
- **One Worker** serves both the app and `/api/*` (Sefaria + OpenAI proxies).

---

## 3. Latest Recommendations (Web-Verified)

### 3.1 Nuxt + Tailwind

Two supported options:

**Option A — @nuxtjs/tailwindcss (recommended for simplicity)**  
- **Docs:** [nuxt.com/modules/tailwindcss](https://nuxt.com/modules/tailwindcss)  
- **Add:** `npx nuxi@latest module add tailwindcss`  
- **Config:** Add `'@nuxtjs/tailwindcss'` to `modules` in `nuxt.config.ts`.  
- **Behavior:** Zero config; looks for `./assets/css/tailwind.css` and `./tailwind.config.{js,ts}` (creates defaults if missing).  
- **Note:** Use **native Vue + Tailwind** only; do not add PrimeVue.

**Option B — Tailwind CSS v4 with Vite**  
- **Docs:** [tailwindcss.com/docs/guides/nuxtjs](https://tailwindcss.com/docs/guides/nuxtjs)  
- **Install:** `npm install tailwindcss @tailwindcss/vite`  
- **Config in `nuxt.config.ts`:**
  - `import tailwindcss from '@tailwindcss/vite'`
  - `vite: { plugins: [tailwindcss()] }`
  - `css: ['~/assets/css/main.css']` (or `./app/assets/css/main.css` if using Nuxt 4 app dir)
- **CSS file:** Single file with `@import "tailwindcss";`

Use **Option A** unless you specifically want Tailwind v4’s Vite-based setup.

### 3.2 Nuxt + Cloudflare (Workers)

- **Cloudflare guide:** [developers.cloudflare.com/workers/frameworks/framework-guides/nuxt](https://developers.cloudflare.com/workers/frameworks/framework-guides/nuxt/)  
- **Nitro Cloudflare:** [nitro.unjs.io/deploy/providers/cloudflare](https://nitro.unjs.io/deploy/providers/cloudflare)

**Recommended: Cloudflare Workers with Static Assets**

- **Preset:** `cloudflare_module` (underscore).  
- **Compatibility date:** `2024-09-19` or later (required for static assets on Workers).  
- **Config in `nuxt.config.ts`:**

```ts
export default defineNuxtConfig({
  compatibilityDate: '2024-09-19',
  nitro: {
    preset: 'cloudflare_module',
    cloudflare: {
      deployConfig: true,
      nodeCompat: true,
    },
  },
  // ... rest of config (modules, css, etc.)
})
```

- **`deployConfig: true`:** Nitro generates a correct `wrangler.json` (or merges with your config).  
- **`nodeCompat: true`:** Enables Node.js compatibility in the Worker.

**Optional — Cloudflare dev preset (local Workers emulation)**  
- **Nitro docs:** “Dev Preset” on [nitro.unjs.io/deploy/providers/cloudflare](https://nitro.unjs.io/deploy/providers/cloudflare).  
- **Use when:** You want to run the app locally in the same runtime as production (e.g. test bindings).  
- **Steps:**  
  1. Install: `npm i -D wrangler`  
  2. In config use the same preset (e.g. `preset: 'cloudflare_module'`).  
  3. With Nitro ≥ 2.12, dev mode can use Cloudflare emulation; bindings can be defined in `wrangler.toml` or under `nitro.cloudflare.wrangler`.

**Alternative — Cloudflare Pages**  
- **Preset:** `cloudflare_pages`.  
- **Nuxt deploy page:** [nuxt.com/deploy/cloudflare](https://nuxt.com/deploy/cloudflare) — zero config with Git integration, or manual: `npx nuxi build --preset=cloudflare_pages` then `npx wrangler pages deploy dist/`.  
- **Note:** Nitro docs recommend **Workers** (`cloudflare_module`) as the main option; use Pages only if you need Pages-specific features.

### 3.3 Project scaffolding (optional)

- **Cloudflare C3:** `npm create cloudflare@latest my-nuxt-app --framework=nuxt`  
- Creates a Nuxt app and can set up deploy. You can then add Tailwind and the Nitro config above.

---

## 4. Migration Steps (High Level)

### Phase A — Nuxt project and Cloudflare config

1. **Create Nuxt app** (new branch or new folder).  
   - Either: `npm create nuxt@latest sefaria-tutor-nuxt` then add Tailwind and Cloudflare config.  
   - Or: `npm create cloudflare@latest sefaria-tutor-nuxt --framework=nuxt` then add Tailwind and ensure Nitro config matches section 3.2.

2. **Configure Cloudflare in `nuxt.config.ts`**  
   - Set `compatibilityDate: '2024-09-19'`.  
   - Set `nitro.preset: 'cloudflare_module'`.  
   - Set `nitro.cloudflare: { deployConfig: true, nodeCompat: true }`.  
   - Add Tailwind (Option A or B from 3.1). Do **not** add PrimeVue.

3. **Environment / secrets**  
   - Use `runtimeConfig` for server-only secrets (e.g. `apiAuthToken`, `openaiApiKey`), filled from env.  
   - Use `runtimeConfig.public` for anything the client needs.  
   - Keep `API_AUTH_TOKEN` and `OPENAI_API_KEY` only on the server (e.g. in API route handlers).

### Phase B — Move proxies into Nuxt server routes

4. **Sefaria proxy**  
   - Implement e.g. `server/api/sefaria/[...path].ts` (or `.js`).  
   - Forward method, path, and query to `https://www.sefaria.org${path}${search}`; set Accept/Content-Type; return JSON with appropriate headers.  
   - Client will call `/api/sefaria/...` (same origin), so CORS is minimal.

5. **OpenAI proxy**  
   - Implement e.g. `server/api/openai/chat.post.ts`.  
   - Read `Authorization: Bearer <token>`, compare to `runtimeConfig.apiAuthToken`; return 401 if invalid.  
   - Forward body to `https://api.openai.com/v1/chat/completions` using `runtimeConfig.openaiApiKey`.  
   - Keep the same system prompt and request shape as in `openai-proxy-worker/openai-proxy.js`.

### Phase C — Frontend (Vue + Tailwind only)

6. **Replace PrimeVue with native Vue + Tailwind**  
   - DataTable/Column → `<table>` + Tailwind.  
   - Dialog → custom modal (overlay + panel, `v-show`/`v-if`).  
   - Button → `<button>` + Tailwind.  
   - Card → `<div>` + border/rounded/shadow.  
   - Paginator → custom prev/next + page numbers.  
   - Accordion/AccordionTab → custom expandable sections or `<details>`/`<summary>` + Tailwind.  
   - InputText → `<input type="text">` + Tailwind.  
   - Icons → inline SVG or a small icon set (no PrimeIcons).

7. **Port app logic**  
   - Move `App.vue` into Nuxt pages/layouts (e.g. one main page + default layout).  
   - Move `CategoryAccordion.vue` into `components/`, using the new table/accordion/button building blocks.  
   - Keep `marked` for markdown; use `useFetch` / `$fetch` for API calls.  
   - Replace hardcoded Worker URLs with relative URLs:  
     - Sefaria: `/api/sefaria/index`, `/api/sefaria/index/...`, `/api/sefaria/texts/...`  
     - OpenAI: `/api/openai/chat` with `Authorization: Bearer ...` (token from runtime config or a small server endpoint).

8. **Tailwind**  
   - Reuse existing Tailwind patterns (verse layout, RTL, fonts).  
   - Remove PrimeVue from content paths; include only app sources (e.g. `app.vue`, `pages/**`, `components/**`).  
   - Keep custom font (e.g. SBL Hebrew) and `@font-face` if used.

9. **Cleanup**  
   - Remove PrimeVue, PrimeIcons, and related imports/registrations.  
   - Remove Vite-specific `index.html` and `vite.config.mjs` (Nuxt owns entry and build).  
   - Keep or move `utils/logger.js` under Nuxt’s `utils/` (or `app/utils/` in Nuxt 4).

### Phase D — Deploy and docs

10. **Build and deploy**  
    - `npm run build` (Nitro outputs the Worker bundle and static assets).  
    - Deploy with Wrangler (e.g. `npx wrangler deploy`) from the project root (Nitro/Wrangler config points at the correct output).  
    - Set `API_AUTH_TOKEN` and `OPENAI_API_KEY` in Cloudflare (dashboard or `wrangler secret put`).

11. **README**  
    - Update with Nuxt, Node version, and Cloudflare deployment steps.  
    - Add “How to test locally” (see section 5).

---

## 5. How to Test Locally

### Option A — Nuxt dev server (daily development)

- **Run:** `npm run dev`  
- **URL:** e.g. `http://localhost:3000`  
- **Behavior:** Nuxt dev server runs both Vue and Nitro server routes.  
- **Secrets:** Use a `.env` in the project root, e.g.  
  `API_AUTH_TOKEN=...`  
  `OPENAI_API_KEY=...`  
  (and map them into `runtimeConfig` in `nuxt.config.ts` if needed).  
- **Use case:** Normal UI and API development; client calls `/api/sefaria/...` and `/api/openai/...` as in production.

### Option B — Production-like build with Wrangler (Cloudflare dev)

- **Build:** `npm run build`  
- **Run:** `npx wrangler dev` (from project root; uses Nitro-generated or your custom Wrangler config).  
- **Secrets:** Put the same vars in **`.dev.vars`** (e.g. `API_AUTH_TOKEN=...`, `OPENAI_API_KEY=...`). Do **not** commit `.dev.vars`.  
- **Use case:** Verify behavior in the real Workers runtime before deploy.

### Env file summary

- **Dev (`npm run dev`):** `.env` (gitignored).  
- **Wrangler dev:** `.dev.vars` (gitignored).  
- **Production:** Cloudflare dashboard or `wrangler secret put ...` for `API_AUTH_TOKEN` and `OPENAI_API_KEY`.

---

## 6. Suggested File Layout (After Migration)

```
sefaria-tutor/
├── app.vue                          # or default layout + page (Nuxt 4 may use app/)
├── nuxt.config.ts                    # Tailwind module + Nitro cloudflare_module
├── pages/
│   └── index.vue                    # main book reader UI (from App.vue)
├── components/
│   ├── CategoryAccordion.vue
│   └── ...                           # modals, tables, buttons (native Vue + Tailwind)
├── server/
│   └── api/
│       ├── sefaria/
│       │   └── [...path].ts          # Sefaria proxy
│       └── openai/
│           └── chat.post.ts          # OpenAI proxy
├── utils/
│   └── logger.js
├── assets/
│   └── css/
│       └── tailwind.css              # if using @nuxtjs/tailwindcss
├── .env                              # dev only, gitignored
├── .dev.vars                         # wrangler dev, gitignored
└── package.json                      # nuxt, @nuxtjs/tailwindcss (or tailwind v4), etc.
```

Keep `sefaria-proxy-worker/` and `openai-proxy-worker/` in the repo only as reference until the Nuxt routes are verified.

---

## 7. References

- **Nuxt Tailwind module:** https://nuxt.com/modules/tailwindcss  
- **Tailwind v4 + Nuxt (Vite):** https://tailwindcss.com/docs/guides/nuxtjs  
- **Cloudflare Nuxt guide:** https://developers.cloudflare.com/workers/frameworks/framework-guides/nuxt/  
- **Nitro Cloudflare (presets, env, wrangler):** https://nitro.unjs.io/deploy/providers/cloudflare  
- **Nuxt deploy Cloudflare:** https://nuxt.com/deploy/cloudflare  

---

*This plan uses the latest recommendations for configuring a Nuxt + Tailwind application for Cloudflare (Workers with Static Assets) and includes instructions for local testing.*
