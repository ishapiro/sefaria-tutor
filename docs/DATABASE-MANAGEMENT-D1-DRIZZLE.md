## D1 Database Management with Drizzle Kit (Headless)

This project uses Cloudflare D1 as the primary database. We manage schema changes with **SQL migrations** and keep application code talking to D1 via the native API (`env.DB.prepare(...)`).  

To make schema evolution safer and more maintainable, we use **Drizzle Kit** as a *headless migration manager*: it only runs on the developer machine to generate and diff SQL, and is never imported into runtime code.

### Goals

- **Single source of truth** for the schema.
- **Safe, reviewable SQL** migrations checked into git.
- **No runtime dependency** on Drizzle ORM – Workers continue to use `env.DB`.
- **Compatible with Wrangler** for applying migrations to D1 in all environments.

---

## Overview of the Workflow

1. **Drizzle Kit** introspects or reads a TypeScript schema and generates SQL migrations.
2. **Wrangler** applies those SQL files to D1 (`wrangler d1 migrations apply`).
3. The application continues to use `env.DB.prepare(...)` / `D1Database` directly.

Drizzle is therefore a **developer tool only**: it lives in `devDependencies`, is used via `npx drizzle-kit ...`, and never ships in the Worker bundle.

---

## Setup (Once per Developer Machine)

### 1. Install Drizzle Kit (dev only)

```bash
npm install -D drizzle-kit drizzle-orm
```

Notes:

- `drizzle-orm` is a peer dependency of Drizzle Kit; we install it to satisfy tooling.
- The Worker code does **not** use `drizzle-orm`.

### 2. Configure Wrangler to Use Drizzle’s Migrations

In `wrangler.toml` or `wrangler.jsonc`, point the D1 binding at the folder where Drizzle will emit SQL migrations (commonly `./drizzle`):

```toml
[[d1_databases]]
binding = "DB"
database_name = "your-db"
database_id = "your-id"
migrations_dir = "./drizzle" # Drizzle output folder
```

If this project already uses `migrations/` as the directory, you can either:

- Change `migrations_dir` to `./drizzle`, or
- Configure Drizzle Kit to write directly into `migrations/`.

Pick one and keep it consistent.

---

## Handling an Existing / “Messy” Database (Indefinite State)

When the live D1 database has drifted (tables created manually, partial schema, old experiments), the safest approach is:

### 1. Introspect the Live Database

Run:

```bash
npx drizzle-kit pull
```

This connects to your live D1 database and generates a `schema.ts` file that reflects the **current** database state (the “indefinite” baseline).

### 2. Treat `schema.ts` as the Source of Truth

Review the generated `schema.ts`:

- Confirm that tables, columns, indexes, and types match what you expect.
- Fix any obvious mistakes in the file (naming, comments, etc.), but don’t change the actual structure unless you plan a migration.

From this point forward, **`schema.ts` is the canonical schema description**.

### 3. Generate a Baseline Migration

Run:

```bash
npx drizzle-kit generate
```

Drizzle will compare `schema.ts` to an empty database and generate **initial SQL migration(s)** in the configured migrations directory (e.g. `./drizzle`).

These files describe the *current* live schema as if you were creating it from scratch.

### 4. Mark the Baseline as Already Applied

Because the live database already has these tables, you **must not** apply the baseline migration again.

Instead:

- Ensure the baseline SQL is committed to git.
- Mark it as “applied” in the D1 migrations table (Cloudflare tracks this in `d1_migrations`).

You can do that by:

- Manually inserting a row into `d1_migrations`, or
- Using `wrangler d1 migrations apply` in a way that only updates the metadata without re-running destructive statements (check the Cloudflare docs for the exact flow you prefer).

The key idea: **Wrangler and D1 must believe you are now at migration version N that corresponds to the baseline.**

---

## Day‑to‑Day Schema Changes

Once the baseline is established, the normal workflow to change the schema is:

1. **Edit `schema.ts`**
   - Add/remove columns.
   - Add new tables or indexes.
   - Adjust constraints as needed.

2. **Generate a New Migration**

   ```bash
   npx drizzle-kit generate
   ```

   Drizzle compares the previous schema to the updated one and creates a new numbered `.sql` file in the migrations directory (`./drizzle` or `./migrations`).

3. **Review the SQL**

   - Open the generated SQL file.
   - Confirm that changes are correct and safe (especially around `DROP`/`ALTER`).
   - Adjust manually if Drizzle’s default is not what you want.

4. **Apply to D1 via Wrangler**

   ```bash
   npx wrangler d1 migrations apply your-db --remote
   ```

   Wrangler:
   - Finds any new migration files.
   - Runs them against the bound D1 database.
   - Updates its internal migration tracking.

5. **Commit to Git**

   - Commit both the updated `schema.ts` and the new migration SQL.

---

## Runtime Code: Staying with `env.DB`

The Worker code does **not** change:

- It continues to use `env.DB.prepare(...)` and the D1 API directly.
- There is **no import** of `drizzle-orm` or `drizzle-kit` in the Worker bundle.
- All migrations and schema management live in tooling and SQL files, not in runtime.

This keeps:

- Bundle size small.
- Runtime dependencies minimal.
- Production behavior predictable and decoupled from migration tooling.

---

## Benefits of This Approach

- **Zero Runtime Overhead**
  - No ORM in production; Drizzle only runs on developer machines.

- **Drift Detection & Recovery**
  - `drizzle-kit pull` lets you introspect the live D1 schema and bring your `schema.ts` back in sync if someone changes the database manually.

- **Safe, Reviewable Migrations**
  - Every database change is a plain SQL file in git.
  - You can code review, test in staging, and roll out with Wrangler.

- **Clear Separation of Concerns**
  - Application uses D1 as usual.
  - Drizzle Kit is a migration generator and schema diff tool.

---

## Quick Reference

- **Initial introspection (existing DB):**

  ```bash
  npx drizzle-kit pull
  npx drizzle-kit generate
  # then mark baseline as applied in D1
  ```

- **Change schema going forward:**

  ```bash
  # 1. Edit schema.ts
  npx drizzle-kit generate
  npx wrangler d1 migrations apply your-db --remote
  ```

Keep this document next to the other design docs (`docs/*.md`) as the canonical reference for how we manage D1 migrations with Drizzle in this project.

