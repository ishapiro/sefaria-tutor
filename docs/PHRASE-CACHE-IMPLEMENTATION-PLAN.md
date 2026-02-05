# Phrase-Level Translation Cache — Implementation Plan

This document details the implementation plan for the phrase-level D1 cache described in [TRANSLATION-CACHE-D1-DESIGN.md](./TRANSLATION-CACHE-D1-DESIGN.md). It uses a **hashed key**, **stored-phrase verification** on access, a **cache (dictionary) viewer** reachable from the main page, **hit-rate tracking**, and an **indexed primary key**. No code is provided; this is design only.

---

## 1. Goals

- Cache translation API responses in Cloudflare D1 keyed by a **hash** of the normalized phrase (not the full phrase as key).
- On every cache access, **verify** that the stored full phrase equals the request’s normalized phrase before returning cached data (handles hash collisions).
- Expose a **dictionary viewer** from the main page for inspecting the cache (debugging and future tools).
- **Track cache hit rates** (hits vs misses) over time.
- Use a **primary key** that is explicitly indexed (D1/SQLite indexes the primary key by default; design calls this out).

---

## 2. Normalization and Hashing

- **Normalization (deterministic, before hashing and storage):**
  - Trim leading/trailing whitespace.
  - Collapse internal runs of whitespace to a single space (e.g. ASCII space).
  - Optionally apply Unicode normalization (e.g. NFC) so equivalent strings always normalize the same way.
  - Do not transliterate or alter Hebrew/Aramaic characters.
- **Hash:** Compute a cryptographic hash of the **normalized** phrase (e.g. SHA-256), then encode for use as a string key (e.g. hex). Same normalized phrase always yields the same key.
- **Storage:** Store both the **hash** (as primary key) and the **full normalized phrase** in the cache row so that (1) lookups use the hash and (2) verification compares stored phrase to the current request’s normalized phrase.

---

## 3. D1 Schema

### 3.1 Cache table: `translation_cache`

| Column          | Type    | Role |
|-----------------|---------|------|
| `phrase_hash`   | TEXT    | Primary key. Hash (e.g. hex) of normalized phrase. |
| `phrase`        | TEXT    | Full normalized phrase. Used for collision verification on read. |
| `response`      | TEXT    | Full JSON response from OpenAI (same shape as current API). |
| `created_at`    | INTEGER | Unix timestamp when the row was inserted. |

- **Primary key:** `phrase_hash`. In D1 (SQLite), the primary key is automatically indexed; no separate CREATE INDEX is required for the PK. The design explicitly relies on this index for fast lookups by hash.
- **Uniqueness:** One row per phrase hash. If a collision ever occurs (different phrase, same hash), the first write wins; the verification step on read ensures that a colliding lookup is treated as a miss (see §4).

### 3.2 Stats table: `cache_stats`

Used to track hit rate. Option A below is recommended for simplicity.

**Option A — Single row, cumulative counters**

| Column       | Type    | Role |
|--------------|---------|------|
| `id`         | INTEGER | Primary key; single row (e.g. `id = 1`). |
| `hits`       | INTEGER | Total cache hits since last reset (or since creation). |
| `misses`     | INTEGER | Total cache misses (translation requested, not served from cache). |
| `updated_at` | INTEGER | Unix timestamp of last update (hits or misses). |

- **Primary key:** `id` (indexed by default). One row updated on every hit and every miss; `hit_rate = hits / (hits + misses)` when `hits + misses > 0`.

**Option B — Time-bucketed events (optional, for later analytics)**

- Table with one row per event: `event_type` (hit/miss), `at` (timestamp). Allows hit rate by day/week. Not required for initial implementation; can be added later if needed.

**Recommendation:** Implement Option A first. Ensure that both “cache hit” and “cache miss” paths update this row (increment `hits` or `misses`, refresh `updated_at`).

---

## 4. Cache Access Flow (Read Path)

1. **Input:** Request body contains the user’s selected text (or the prompt substring that encodes the phrase). Server extracts the phrase (e.g. from “Translate this phrase to English: …”) and **normalizes** it using the same rules as for hashing.
2. **Key:** Compute the **hash** of the normalized phrase (same algorithm and encoding as in write path).
3. **Lookup:** Query `translation_cache` by `phrase_hash = <computed hash>`. Use the primary key so the query uses the index.
4. **Verification:** If a row is found, compare the row’s `phrase` to the **current request’s normalized phrase** (byte- or string-equality).  
   - If they **match:** treat as a cache hit: return the stored `response` JSON to the client; increment `cache_stats.hits` (and update `updated_at`).  
   - If they **differ:** treat as a **collision** (same hash, different phrase). Do **not** return the cached response. Proceed as cache miss: call OpenAI, then write the new result to the cache (new row keyed by the same hash will overwrite the colliding row, or you may choose to avoid overwriting and only insert on miss; see §5). Increment `cache_stats.misses`.
5. **Miss:** If no row is found, treat as cache miss: call OpenAI; on success, write to cache (see §5) and increment `cache_stats.misses`; return the API response to the client.

This ensures that only requests whose normalized phrase exactly matches the stored phrase are served from cache; any hash collision results in a safe miss and a fresh OpenAI call.

---

## 5. Cache Write Flow (on OpenAI Response)

1. **Input:** Normalized phrase used for the request and the successful OpenAI response body (full JSON).
2. **Key:** Compute the **hash** of the normalized phrase (same as read path).
3. **Conflict handling:**  
   - If the design allows overwrite: `INSERT OR REPLACE` (or equivalent) so that a colliding hash overwrites the previous row. Verification on read still prevents returning wrong data for a different phrase.  
   - If the design disallows overwrite: check for existing row by `phrase_hash`; if exists, compare `phrase`; only insert if phrase matches (update response/created_at) or if no row exists. On collision (same hash, different phrase), either skip write or use a secondary strategy (e.g. store under a different key); the implementation plan should choose one and document it.
4. **Insert:** Store `phrase_hash`, `phrase`, `response`, `created_at` in `translation_cache`.
5. Do **not** increment hits here; only increment `misses` when the request was a miss (before the OpenAI call).

---

## 6. Hit Rate Tracking

- **When to increment:**  
  - **Hits:** When a cache lookup finds a row and the stored `phrase` equals the request’s normalized phrase, and the response is returned from cache.  
  - **Misses:** When the response is not served from cache (either no row, or verification failed), regardless of whether OpenAI was called and a new row was written.
- **Where:** In the same request path that performs the cache lookup and (on miss) the OpenAI call. Single transaction or two updates: one for cache read/write, one for stats update. Stats can be updated asynchronously to avoid blocking the response, as long as consistency is acceptable (eventual consistency for stats is usually fine).
- **Exposure:** Stats (`hits`, `misses`, `updated_at`) can be read by the dictionary viewer and/or a small admin/stats API so operators can monitor hit rate (e.g. `hits / (hits + misses)`).

---

## 7. Dictionary (Cache) Viewer

### 7.1 Purpose

- **Debugging:** Inspect what phrases and responses are in the cache; verify hash, phrase, and stored JSON.
- **Building new tools:** Browse and search the cache to design features that depend on cached translations (e.g. export, bulk analysis, or future word-level tools).

### 7.2 Placement and Access

- **Entry point:** The main page (e.g. index or layout) includes a link or button (e.g. “Dictionary” or “Cache viewer”) that navigates to the dictionary viewer. It can be in the header, footer, or a settings/menu area so it’s always reachable but not dominant.
- **Route:** Dedicated route, e.g. `/dictionary` or `/cache` (or `/tools/dictionary` if you group tools). The viewer is a separate page.

### 7.3 Data and Backing API

- **Data source:** Server-side API (e.g. `GET /api/cache/entries` or `GET /api/dictionary`) that queries D1: `translation_cache` (and optionally `cache_stats`).  
  - List entries: support pagination (e.g. `limit` + `offset` or cursor) and optional search/filter (e.g. by phrase substring or hash).  
  - Return for each entry: `phrase_hash`, `phrase`, optionally a short snippet of the translation (e.g. first 100 chars of `translatedPhrase` from parsed `response`), and `created_at`. Full `response` can be returned on demand (e.g. detail view or second endpoint).
- **Stats:** Same or separate endpoint returns `hits`, `misses`, `updated_at` (and derived hit rate) for display in the viewer.

### 7.4 Viewer Capabilities (Design)

- **List view:** Paginated table (or list) of cache entries with columns: hash (e.g. first 16 chars + “…”), phrase (truncated if long), translation snippet, created_at. Optional: sort by created_at (newest first) or by phrase.
- **Search/filter:** Optional search box to filter by phrase (substring match) or by hash prefix; list updates via same API with query params.
- **Detail view:** Clicking an entry opens a detail view showing full phrase, full hash, full cached JSON (or at least `originalPhrase`, `translatedPhrase`, and wordTable summary). Useful for debugging and for designing tools that consume cache data.
- **Hit rate display:** At the top or side of the viewer, show current hit rate (e.g. “Hits: 1,234, Misses: 567, Hit rate: 68.5%”) and last updated time from `cache_stats`.
- **Access control:** Design whether the viewer is public (any authenticated user) or restricted (e.g. same auth as main app, or a separate admin token). If the cache contains no PII, same auth as main app is often sufficient; document the choice.

---

## 8. Index on Primary Key

- **Cache table:** The primary key of `translation_cache` is `phrase_hash`. In D1 (SQLite), a primary key constraint implies a unique index. No additional CREATE INDEX is required for the primary key; the design explicitly assumes this index exists and is used for all lookups by `phrase_hash`.
- **Stats table:** The primary key of `cache_stats` is `id`. Same as above; index is implicit.
- **Other indexes:** No other indexes are required for the initial phrase-level cache. If the dictionary viewer later supports frequent filtering by `phrase` (e.g. substring search), consider documenting an optional secondary index on `phrase` or a FTS (full-text) extension in a later phase; not part of the initial implementation plan.

---

## 9. Implementation Order (Suggested)

1. **D1 database and schema:** Create D1 database (e.g. via Wrangler); run migrations to create `translation_cache` (with PK `phrase_hash`) and `cache_stats` (single row, PK `id`). Ensure bindings are added to the Worker in `wrangler.toml`.
2. **Normalization and hashing:** Implement shared normalization and hashing (same logic for read and write). Define hash algorithm and encoding (e.g. SHA-256, hex).
3. **Read path:** In the translation API handler, before calling OpenAI: normalize input phrase → compute hash → lookup by `phrase_hash` → if row found, verify `phrase` equals normalized input; if match, return stored `response` and increment hits; else treat as miss.
4. **Write path:** On OpenAI success: normalize phrase → compute hash → insert (or replace) into `translation_cache`; increment misses when the request was a miss.
5. **Hit rate:** Initialize `cache_stats` with one row (e.g. `id=1`, `hits=0`, `misses=0`); wire hit/miss increments in the read path.
6. **Dictionary viewer API:** Add `GET /api/cache/entries` (and optionally `GET /api/cache/stats`) with pagination and optional search; return phrase_hash, phrase, snippet, created_at, and stats.
7. **Dictionary viewer page:** Add route and page; list entries, optional search, detail view, hit rate display; link from main page.

---

## 10. Summary

| Item | Design choice |
|------|----------------|
| Key | Hash (e.g. SHA-256 hex) of normalized phrase; primary key of `translation_cache`. |
| Collision safety | On every cache access, compare stored `phrase` to request’s normalized phrase; only return cache when they match. |
| Dictionary viewer | Dedicated page (e.g. `/dictionary`), linked from main page; list + search + detail + hit rate; backed by D1 via server API. |
| Hit rate | `cache_stats` table with `hits`, `misses`, `updated_at`; increment on each hit and each miss; expose in viewer and/or stats API. |
| Index | Primary key on `phrase_hash` (and on `cache_stats.id`); rely on D1/SQLite’s automatic PK index; no extra index for initial scope. |

This plan keeps the phrase-level cache simple, safe under hash collisions, observable (viewer + hit rate), and ready for implementation without prescribing specific code.

---

## 11. Local Development and Testing

Because the cache relies on Cloudflare D1, it cannot be tested using the standard `npm run dev` (Nuxt/Nitro dev server), as that environment does not provide D1 bindings.

**Testing workflow:**
1. **Run development mode:** `npm run dev`. This script is now configured to automatically build the app and start `wrangler dev`.
2. **Configure secrets:** Ensure `.dev.vars` exists with your keys.
3. **Initialize local D1:** (First time only) Run migrations with the `--local` flag.
4. **Verify:** Open the app at the Wrangler URL (usually `http://localhost:8787`).
