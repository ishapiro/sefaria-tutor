# Cloudflare D1 Database Capacity Estimate

## Cloudflare D1 Limits

**Per Database:**
- **Free Plan:** 500 MB maximum per database
- **Paid Plan:** 10 GB maximum per database

**Per Account:**
- **Free Plan:** 5 GB total storage across all databases
- **Paid Plan:** 1 TB total storage across all databases

**Note:** The 10 GB per-database limit cannot be increased. Cloudflare recommends horizontal scaling (multiple databases) for larger needs.

---

## Data Size Estimates

### 1. User Accounts (`users` table)
- **Per user:** ~200-300 bytes
  - `id`: ~40 bytes (UUID or OAuth ID)
  - `email`: ~30 bytes average
  - `name`: ~30 bytes average
  - `role`: ~10 bytes
  - `password_hash`: ~60 bytes (if email/password auth)
  - `is_verified`: 1 byte
  - `verification_token`: ~40 bytes (if present)
  - `token_expires_at`: 8 bytes
  - `team_id`: ~40 bytes (if present)
  - `created_at`: 8 bytes
  - **Total:** ~267 bytes per user (assuming some nullable fields)

### 2. User Word Lists (`user_word_list` table)
- **Per word entry:** ~2-5 KB (JSON stored as TEXT)
  - `id`: 8 bytes (INTEGER)
  - `user_id`: ~40 bytes
  - `word_data`: ~2-5 KB (JSON with wordEntry, originalPhrase, translatedPhrase, sourceText, etc.)
  - `created_at`: 8 bytes
  - **Total:** ~2-5 KB per word entry

**Assumptions:**
- Average word entry JSON: ~3 KB
- Average words per user: 50-100 words (typical study list)
- Power users: 200-500 words

### 3. Translation Cache (`translation_cache` table)
- **Per cache entry:** ~5-20 KB
  - `phrase_hash`: ~64 bytes (SHA-256 hex)
  - `phrase`: ~50-200 bytes (Hebrew phrase)
  - `response`: ~5-20 KB (full OpenAI JSON response)
  - `created_at`: 8 bytes
  - `version`: 8 bytes
  - `prompt_hash`: ~64 bytes
  - **Total:** ~5-20 KB per cached phrase

**Note:** This is shared across all users (global cache).

### 4. Pronunciation Cache (`pronunciation_cache` table)
- **Per entry:** ~200-300 bytes (metadata only; actual audio files stored in R2)
  - `text_hash`: ~64 bytes
  - `normalized_text`: ~50 bytes
  - `r2_key`: ~100 bytes
  - `file_size_bytes`: 8 bytes
  - `created_at`: 8 bytes
  - `last_accessed_at`: 8 bytes
  - `access_count`: 8 bytes
  - **Total:** ~246 bytes per entry

**Note:** This is shared across all users.

### 5. Teams (`teams` table)
- **Per team:** ~200 bytes
  - `id`: ~40 bytes
  - `name`: ~50 bytes
  - `leader_id`: ~40 bytes
  - `invite_code`: ~20 bytes
  - `created_at`: 8 bytes
  - **Total:** ~158 bytes per team

### 6. Cache Stats Tables
- **Fixed size:** ~100 bytes each (single row tables)
  - `cache_stats`: ~100 bytes
  - `pronunciation_cache_stats`: ~100 bytes

---

## Capacity Calculations

### Scenario 1: Conservative Estimate (Paid Plan - 10 GB limit)

**Assumptions:**
- Average user: 50 words saved
- Average word entry: 3 KB
- Translation cache: 100,000 unique phrases (shared)
- Pronunciation cache: 50,000 entries (shared)

**Storage breakdown:**
- Users: 100,000 users × 300 bytes = **30 MB**
- User word lists: 100,000 users × 50 words × 3 KB = **15 GB** ❌ (exceeds limit)
- Translation cache: 100,000 phrases × 10 KB = **1 GB**
- Pronunciation cache: 50,000 entries × 300 bytes = **15 MB**
- Teams: 1,000 teams × 200 bytes = **0.2 MB**
- Stats tables: **0.2 MB**

**Total:** ~16.2 GB (exceeds 10 GB limit)

### Scenario 2: Realistic Estimate (Paid Plan - 10 GB limit)

**Assumptions:**
- Average user: 30 words saved
- Average word entry: 2.5 KB
- Translation cache: 50,000 unique phrases (shared)
- Pronunciation cache: 25,000 entries (shared)

**Storage breakdown:**
- Users: 50,000 users × 300 bytes = **15 MB**
- User word lists: 50,000 users × 30 words × 2.5 KB = **3.75 GB**
- Translation cache: 50,000 phrases × 10 KB = **500 MB**
- Pronunciation cache: 25,000 entries × 300 bytes = **7.5 MB**
- Teams: 500 teams × 200 bytes = **0.1 MB**
- Stats tables: **0.2 MB**

**Total:** ~4.3 GB (well within 10 GB limit)

### Scenario 3: Maximum Capacity Estimate (Paid Plan - 10 GB limit)

**Assumptions:**
- Average user: 20 words saved
- Average word entry: 2 KB
- Translation cache: 100,000 unique phrases (shared)
- Pronunciation cache: 50,000 entries (shared)

**Storage breakdown:**
- Users: 200,000 users × 300 bytes = **60 MB**
- User word lists: 200,000 users × 20 words × 2 KB = **8 GB**
- Translation cache: 100,000 phrases × 10 KB = **1 GB**
- Pronunciation cache: 50,000 entries × 300 bytes = **15 MB**
- Teams: 2,000 teams × 200 bytes = **0.4 MB**
- Stats tables: **0.2 MB**

**Total:** ~9.1 GB (within 10 GB limit)

---

## Key Findings

### Bottleneck: User Word Lists
The **user word lists** are the primary storage consumer, not user accounts or cache tables.

### Realistic Capacity Estimate

**With Paid Plan (10 GB limit):**
- **Conservative:** ~30,000-50,000 active users (assuming 30-50 words per user average)
- **Optimistic:** ~100,000-200,000 users (assuming 20-30 words per user average)
- **Power users:** Fewer users if many save 100+ words each

**With Free Plan (500 MB limit):**
- **Very limited:** ~5,000-10,000 users (assuming 20-30 words per user)
- Not recommended for production

### Factors Affecting Capacity

1. **Average words per user:** Biggest factor
   - Light users (10 words): Supports more users
   - Heavy users (100+ words): Supports fewer users

2. **Translation cache size:** Shared resource, grows with unique phrases
   - Could be 500 MB - 2 GB depending on usage patterns

3. **Word entry JSON size:** Varies with:
   - Length of `originalPhrase` and `translatedPhrase`
   - Amount of metadata in `wordEntry` (grammar notes, etc.)
   - Source text reference length

### Optimization Strategies (if needed)

1. **Archive old words:** Move words older than X days to separate archive table
2. **Compress JSON:** Use compression for `word_data` column (adds CPU cost)
3. **Limit word entry size:** Truncate very long grammar notes or phrases
4. **Separate cache database:** Move translation/pronunciation cache to separate DB (frees up space for user data)
5. **Horizontal scaling:** Split users across multiple databases (requires application changes)

---

## Recommendation

**For current scale:** Single database is sufficient for:
- **10,000-50,000 active users** with typical usage (20-50 words per user)
- This covers most educational/small-to-medium applications

**Consider separating cache when:**
- Approaching 5-6 GB of user data
- Translation cache exceeds 2-3 GB
- Need independent cache management/clearing

**Consider horizontal scaling when:**
- Exceeding 8-9 GB total
- Need to support 100,000+ users
- Want per-tenant isolation

---

**Last Updated:** Based on current schema and Cloudflare D1 limits as of 2024
