# Pronunciation Cache - Quick Command Reference

## Local Setup

### 1. Run Migration
```bash
npx wrangler d1 execute sefaria-tutor-db --local --file=migrations/0007_pronunciation_cache.sql
```

### 2. (Optional) Set Smaller Cache Size for Testing
Add to `.dev.vars`:
```bash
PRONUNCIATION_CACHE_MAX_SIZE_BYTES=104857600  # 100 MB for testing
```

### 3. Start Dev Server
```bash
npm run dev
```

---

## Production Setup

### 1. Create R2 Bucket
```bash
npx wrangler r2 bucket create sefaria-tutor-pronunciations
```

### 2. Run Migration
```bash
npx wrangler d1 execute sefaria-tutor-db --file=migrations/0007_pronunciation_cache.sql
```

### 3. (Optional) Set Custom Cache Size
```bash
npx wrangler secret put PRONUNCIATION_CACHE_MAX_SIZE_BYTES
# Enter: 524288000 (for 500 MB default) or your desired size in bytes
```

### 4. Deploy
```bash
npm run deploy
```

---

## Verification Commands

### Check Migration Applied (Local)
```bash
npx wrangler d1 execute sefaria-tutor-db --local --command "SELECT name FROM sqlite_master WHERE type='table' AND name='pronunciation_cache';"
```

### Check Stats (Local)
```bash
npx wrangler d1 execute sefaria-tutor-db --local --command "SELECT * FROM pronunciation_cache_stats WHERE id = 1;"
```

### Check R2 Bucket (Production)
```bash
npx wrangler r2 bucket list
```

### Check Cache Count (Production)
```bash
npx wrangler d1 execute sefaria-tutor-db --command "SELECT COUNT(*) as count FROM pronunciation_cache;"
```

---

## Troubleshooting

### Reset Local Cache (if needed)
```bash
npx wrangler d1 execute sefaria-tutor-db --local --command "DROP TABLE IF EXISTS pronunciation_cache; DROP TABLE IF EXISTS pronunciation_cache_stats;"
# Then re-run migration
npx wrangler d1 execute sefaria-tutor-db --local --file=migrations/0007_pronunciation_cache.sql
```
