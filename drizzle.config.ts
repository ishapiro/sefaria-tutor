import { defineConfig } from 'drizzle-kit'

export default defineConfig({
  // Path to the Drizzle schema that describes the current D1 database structure.
  // You can create this as `drizzle/schema.ts` and keep it in sync with the live schema.
  schema: './drizzle/schema.ts',

  // Output directory for generated SQL migrations.
  // This reuses the existing Cloudflare D1 migrations directory so Wrangler can apply them.
  out: './migrations',

  // Cloudflare D1 is SQLite-compatible, so we use the SQLite dialect.
  dialect: 'sqlite',

  // Drizzle uses this SQLite URL when introspecting or diffing.
  // Recommended: point it at a local copy of your D1 database (exported via Wrangler),
  // or another SQLite file that mirrors your production schema.
  dbCredentials: {
    url: process.env.DRIZZLE_DB_URL ?? 'file:./.local/d1.sqlite',
  },
})

