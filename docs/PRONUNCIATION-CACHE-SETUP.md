# Pronunciation Cache Setup Guide

This guide provides all the commands needed to set up the pronunciation cache system both locally and on Cloudflare.

## Overview

The pronunciation cache stores audio files (MP3) in Cloudflare R2 and metadata in Cloudflare D1. This reduces OpenAI TTS API costs by caching frequently requested pronunciations.

**Default Configuration:**
- **Max Cache Size**: 500 MB (524,288,000 bytes)
- **Storage**: Cloudflare R2 bucket `sefaria-tutor-pronunciations`
- **Metadata**: Cloudflare D1 database
- **Purge Strategy**: LRU (Least Recently Used) - auto-purges at 90% capacity down to 70%

---

## Local Development Setup

### 1. Run the Database Migration

Apply the pronunciation cache schema to your local D1 database:

```bash
npx wrangler d1 execute sefaria-tutor-db --local --file=migrations/0007_pronunciation_cache.sql
```

### 2. Create Local R2 Bucket

Wrangler automatically creates local R2 buckets when you run the dev server. The bucket name is defined in `wrangler.toml` as `sefaria-tutor-pronunciations`.

**Note**: Local R2 buckets are stored in `.wrangler/state/r2/` and are automatically created when you start the dev server.

### 3. Optional: Set Custom Cache Size for Local Testing

To test purge behavior locally with a smaller cache size, add to your `.dev.vars` file:

```bash
PRONUNCIATION_CACHE_MAX_SIZE_BYTES=104857600
```

This sets the cache to 100 MB (instead of 500 MB) so you can test purging more easily.

### 4. Start Development Server

```bash
npm run dev
```

The pronunciation cache will work automatically. You can test it by:
1. Requesting a pronunciation via the TTS API
2. Requesting the same pronunciation again (should be served from cache)
3. Checking the admin panel at `/admin` → "Pronunciation Cache Management"

---

## Cloudflare Production Setup

### 1. Create R2 Bucket

Create the R2 bucket in your Cloudflare dashboard:

```bash
# Option 1: Using Wrangler CLI
npx wrangler r2 bucket create sefaria-tutor-pronunciations

# Option 2: Using Cloudflare Dashboard
# Go to: https://dash.cloudflare.com → R2 → Create bucket
# Name: sefaria-tutor-pronunciations
```

### 2. Run Database Migration

Apply the migration to your production D1 database:

```bash
npx wrangler d1 execute sefaria-tutor-db --file=migrations/0007_pronunciation_cache.sql
```

**Important**: Replace `sefaria-tutor-db` with your actual database name if different.

### 3. Verify R2 Bucket Binding

The R2 bucket binding is already configured in `wrangler.toml`:

```toml
[[r2_buckets]]
binding = "PRONUNCIATION_CACHE"
bucket_name = "sefaria-tutor-pronunciations"
```

This binding will be automatically applied when you deploy.

### 4. Optional: Set Custom Cache Size

To override the default 500 MB cache size, set an environment variable in Cloudflare:

```bash
# Using Wrangler
npx wrangler secret put PRONUNCIATION_CACHE_MAX_SIZE_BYTES
# When prompted, enter: 524288000 (for 500 MB) or your desired size in bytes

# Or via Cloudflare Dashboard:
# Workers & Pages → Your Worker → Settings → Variables → Environment Variables
# Add: PRONUNCIATION_CACHE_MAX_SIZE_BYTES = 524288000
```

### 5. Deploy

Deploy your application:

```bash
npm run deploy
```

Or manually:

```bash
npm run build
npx wrangler deploy
```

---

## Verification Steps

### Local Verification

1. **Check Migration Applied**:
   ```bash
   npx wrangler d1 execute sefaria-tutor-db --local --command "SELECT name FROM sqlite_master WHERE type='table' AND name='pronunciation_cache';"
   ```
   Should return: `pronunciation_cache`

2. **Check Stats Table**:
   ```bash
   npx wrangler d1 execute sefaria-tutor-db --local --command "SELECT * FROM pronunciation_cache_stats WHERE id = 1;"
   ```
   Should return a row with all zeros initially.

3. **Test Cache via API**:
   - Make a TTS request: `POST /api/openai/tts` with `{ "text": "בראשית" }`
   - Make the same request again
   - Check admin panel stats - should show 1 miss, 1 hit

### Production Verification

1. **Check R2 Bucket**:
   ```bash
   npx wrangler r2 bucket list
   ```
   Should show `sefaria-tutor-pronunciations`

2. **Check Database**:
   ```bash
   npx wrangler d1 execute sefaria-tutor-db --command "SELECT COUNT(*) as count FROM pronunciation_cache;"
   ```

3. **Check Admin Panel**:
   - Navigate to `/admin` (requires admin role)
   - Click "Manage Pronunciation Cache"
   - Verify statistics are loading correctly

---

## Troubleshooting

### Local R2 Not Working

If local R2 isn't working:
1. Ensure you're using the latest Wrangler version: `npm install -g wrangler@latest`
2. Delete `.wrangler/state/r2/` and restart the dev server
3. Check that `wrangler.toml` has the R2 binding configured

### Migration Errors

If you see "table already exists" errors:
- The migration uses `CREATE TABLE IF NOT EXISTS`, so this is safe to ignore
- If you need to reset, you can drop the tables manually:
  ```bash
  npx wrangler d1 execute sefaria-tutor-db --local --command "DROP TABLE IF EXISTS pronunciation_cache; DROP TABLE IF EXISTS pronunciation_cache_stats;"
  ```
  Then re-run the migration.

### Cache Not Working

If pronunciations aren't being cached:
1. Check that both D1 and R2 bindings are available in your Worker
2. Check browser console for errors
3. Verify the TTS endpoint is being called (check Network tab)
4. Check server logs for cache-related errors

### Admin Panel Not Loading

If the admin panel shows errors:
1. Verify you're logged in as an admin user
2. Check browser console for API errors
3. Verify the admin API routes are deployed:
   - `/api/admin/pronunciation-cache/stats`
   - `/api/admin/pronunciation-cache/entries`
   - `/api/admin/pronunciation-cache/purge`
   - `/api/admin/pronunciation-cache/clear`

---

## Cost Estimation

**Storage Costs (R2):**
- 500 MB = ~$0.0075/month
- 1 GB = $0.015/month
- 5 GB = $0.075/month

**Operations Costs (R2):**
- Class A (PUT): $4.50 per million operations
- Class B (GET): $0.36 per million operations

**Example Monthly Costs:**
- 100K cache writes = $0.45
- 1M cache reads = $0.36
- 1 GB storage = $0.015
- **Total**: ~$0.83/month

**Savings:**
- Each cached pronunciation saves ~$0.00015 in OpenAI API costs
- With 80% hit rate on 100K requests/month: **~$12/month saved**

---

## Maintenance

### Manual Cache Purge

You can manually purge the cache from the admin panel:
1. Go to `/admin` → "Pronunciation Cache Management"
2. Click "Purge Old Entries (LRU)"
3. This will remove least recently used entries until cache is at 70% capacity

### Clear All Cache

To completely clear the cache:
1. Go to `/admin` → "Pronunciation Cache Management"
2. Click "Clear All Cache"
3. Confirm the action (requires double confirmation)

### Monitor Cache Size

The admin panel shows:
- Current cache size and percentage of max
- Total number of cached files
- Hit/miss ratio
- Last purge timestamp

---

## API Endpoints

### Public Endpoints

- `POST /api/openai/tts` - Generate or retrieve pronunciation (cached automatically)

### Admin Endpoints (require admin role)

- `GET /api/admin/pronunciation-cache/stats` - Get cache statistics
- `GET /api/admin/pronunciation-cache/entries` - List cache entries (paginated, searchable)
- `POST /api/admin/pronunciation-cache/purge` - Trigger LRU purge
- `POST /api/admin/pronunciation-cache/clear` - Clear all cache
- `DELETE /api/admin/pronunciation-cache/entries/:hash` - Delete specific entry

---

## Files Created/Modified

### New Files
- `migrations/0007_pronunciation_cache.sql` - Database schema
- `server/utils/pronunciation-cache.ts` - Cache utility functions
- `server/api/admin/pronunciation-cache/*.ts` - Admin API endpoints

### Modified Files
- `wrangler.toml` - Added R2 bucket binding
- `server/api/openai/tts.post.ts` - Added cache check/store logic
- `pages/admin.vue` - Added pronunciation cache management UI

---

## Next Steps

1. Deploy to production using the commands above
2. Monitor cache hit rates in the admin panel
3. Adjust `PRONUNCIATION_CACHE_MAX_SIZE_BYTES` if needed based on usage
4. Consider setting up Cloudflare Cron Triggers for scheduled purges (optional)
