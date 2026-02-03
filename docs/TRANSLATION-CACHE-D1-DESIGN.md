# Translation Cache with Cloudflare D1 — Design

**Goal:** Use [Cloudflare D1](https://developers.cloudflare.com/d1/) as a cache for Hebrew/Aramaic→English translations to speed up responses and reduce OpenAI API usage.

**Context:** The app currently sends every user-selected phrase to OpenAI and receives JSON with `originalPhrase`, `translatedPhrase`, and `wordTable` (per-word translation, root, part of speech, grammar notes, etc.). The design must support both “exact phrase” lookups and a strategy that minimizes calls when only some words are cached.

---

## 1. High-Level Architecture

- **Where the cache lives:** D1 database, bound to the same Worker that serves `/api/openai/chat` (or a dedicated translation API route). Nitro on Cloudflare can bind D1 via `wrangler.toml` and `useStorage()`/D1 bindings depending on how you expose it.
- **Flow:** On each translation request, the server (1) normalizes the input phrase, (2) consults D1, (3) if full hit → return cached JSON; if partial or miss → call OpenAI, then (4) optionally write back to D1 for future requests.
- **Cache key:** Normalized form of the selected text (see §3). No user/session in the key so the cache is global and reusable across all users.

---

## 2. Caching Strategy: Exact Phrases vs Individual Words

### 2.1 Cache exact selected phrases (phrase-level cache)

**Idea:** Use the user’s exact selected string (normalized) as the cache key. Store the full API response: `originalPhrase`, `translatedPhrase`, `wordTable`.

**Pros:**

- **Exact match:** No ambiguity. If the user selected “הילד אכל תפוח” and we have that key, we return the cached result. No composition logic.
- **Full fidelity:** Cached response is exactly what OpenAI would return for that phrase (same phrase translation, same wordTable), so UI and word-by-word display stay correct.
- **Simple implementation:** One table, one key (normalized phrase), one blob (or structured columns) for the JSON. No tokenization or merging.
- **No “don’t translate” problem:** We never ask OpenAI to “skip” words; we either serve 100% from cache or 100% from OpenAI.

**Cons:**

- **Low hit rate for rare phrases:** Users often select unique or long phrases. Exact phrase matches may be infrequent unless the same verses/phrases are requested repeatedly (e.g. popular verses, repeated study).
- **Storage:** More rows (one per distinct phrase). Still small per row; D1’s 10 GB per DB is plenty for millions of phrase-sized entries.

**Verdict:** Phrase-level caching is the simplest and safest first step. It gives immediate wins for repeated phrases (e.g. same verse clicked multiple times, or shared curricula) with no change to the OpenAI prompt or response shape.

---

### 2.2 Cache individual words (word-level cache)

**Idea:** Tokenize the selected text into words (Hebrew/Aramaic tokenization), look up each word in D1, and for any **uncached** words call OpenAI. Then merge cached word rows with OpenAI’s output to build the full `wordTable` and a composed `translatedPhrase`.

**Pros:**

- **Higher hit rate:** The same word (e.g. “בְּרֵאשִׁית”, “אֱלֹהִים”) appears in many phrases. One cached word benefits every phrase containing it. Over time, most common vocabulary is cached.
- **Lower OpenAI usage:** Only uncached words generate API calls. For a phrase of 10 words with 8 cached, you send a smaller request (e.g. “translate only these 2 words in context”) and then merge.

**Cons:**

- **Tokenization:** Hebrew/Aramaic tokenization (splitting on spaces, handling prefixes/suffixes like ה, ו, כ, ל) is non-trivial. You need a consistent tokenizer so cache keys match. Mistakes produce wrong keys and cache misses or wrong merges.
- **Context and ambiguity:** A word’s translation and grammar depend on context (e.g. “ארץ” as “land” vs “earth”). Caching “word → single translation” loses context. You can cache “word + optional context” (e.g. phrase hash) but then you drift toward phrase-like keys and more keys per word.
- **Composition complexity:** You must (1) split phrase into tokens, (2) query D1 per word (or batch), (3) decide which words are “missing”, (4) call OpenAI only for those, (5) merge cached rows with OpenAI’s wordTable and (6) recompose `translatedPhrase`. Merging order (wordTable) and composing natural English (translatedPhrase) from mixed sources is error-prone.
- **OpenAI “don’t translate” requirement:** If you cache words and only send uncached words to OpenAI, you must tell the model to translate **only** those tokens and not re-translate the cached ones. Otherwise it will translate the whole phrase and you duplicate work and risk inconsistency (see §3.2).

**Verdict:** Word-level caching can reduce cost and latency once a core vocabulary is cached, but it is more complex (tokenization, merging, prompt design). Recommend implementing **phrase-level cache first**, then consider word-level as a second phase with a clear tokenization and merge strategy.

---

## 3. Design Details

### 3.1 Normalization and cache key (phrase-level)

- **Normalization:** Apply a single, deterministic normalization to the selected string before using it as key or lookup:
  - Trim and collapse internal whitespace (e.g. replace `\s+` with a single space).
  - Optionally normalize Unicode (e.g. canonical equivalence) so visually identical text always maps to the same key.
  - Do **not** change the actual Hebrew/Aramaic characters (no transliteration) so the key stays readable and debuggable.
- **Key:** Use the normalized string as the primary key, or store a hash (e.g. SHA-256) of the normalized string as key and keep the normalized string in a column if you want to inspect or debug.
- **Idempotence:** Same selection → same key → same cached result.

### 3.2 Telling OpenAI not to translate cached words (word-level strategy)

If you move to word-level caching, you have two ways to avoid re-translating cached words:

**Option A — Placeholder substitution (recommended):**

- Replace each **cached** word in the phrase with a unique placeholder (e.g. `__W1__`, `__W2__`, …) and pass the model two things:
  1. The phrase with placeholders: e.g. “__W1__ __W2__ תפוח” (only “תפוח” is uncached).
  2. A mapping: “__W1__ = הילד, __W2__ = אכל”.
- **Instruction to the model:** “Translate only the Hebrew/Aramaic words that appear in the phrase. For each placeholder (e.g. __W1__), do not translate; in your output use the placeholder as-is and in the wordTable use the given mapping for that placeholder’s word and translation.”
- You then post-process: replace placeholders in the model’s output with the cached `word` and `wordTranslation`, and merge the cached `wordTable` rows (in order) with the new rows from OpenAI so the final `wordTable` has one entry per word in original order.
- **Benefit:** The model sees the full sentence structure and can produce a natural `translatedPhrase` that mixes placeholder “slots” with newly translated words; you substitute cached translations into those slots.

**Option B — “Translate only these words” list:**

- Send the full phrase plus an explicit list: “Translate only these words (provide wordTable entries and their English): [תפוח]. The following words are already translated; do not translate them: [הילד → boy, אכל → ate].”
- The model returns wordTable only for the requested words; you merge with cached rows by position.
- **Drawback:** You must compose the full `translatedPhrase` yourself (e.g. by concatenating cached + new translations in order), which may sound less natural than Option A.

**Recommendation:** Prefer **Option A (placeholders)** so the model still produces a coherent full-sentence translation; you only substitute placeholders with cached values and merge wordTable rows.

---

## 4. D1 Schema (conceptual)

**Phrase-level cache (recommended for v1):**

- **Table:** e.g. `translation_cache`.
- **Columns (conceptual):**
  - `key` (TEXT PRIMARY KEY): normalized phrase or hash of normalized phrase.
  - `original_phrase` (TEXT): original normalized phrase (if key is hash).
  - `response` (TEXT): full JSON response from OpenAI (`originalPhrase`, `translatedPhrase`, `wordTable`) stored as JSON string.
  - `created_at` (INTEGER): Unix timestamp for TTL or analytics.

**Word-level cache (future):**

- **Table:** e.g. `word_translation_cache`.
- **Columns (conceptual):**
  - `word` (TEXT): normalized word form (e.g. as produced by your tokenizer).
  - `context_key` (TEXT, optional): optional context (e.g. phrase hash or “default”) to allow one word → multiple translations in different contexts.
  - `word_row` (TEXT): JSON for one `wordTable` row (word, wordTranslation, hebrewAramaic, wordRoot, …).
  - `created_at` (INTEGER).
- **Primary key:** `(word, context_key)` or just `word` if you do not use context.
- **Trade-off:** Without context_key, you get one translation per word (simpler, lower hit quality). With context_key, you get better accuracy and more keys.

---

## 5. Request Flow (phrase-level)

1. Client sends translation request with selected text (unchanged from today).
2. Server normalizes the text and checks D1 for that key.
3. **Cache hit:** Return the stored `response` JSON (same shape as current API). No OpenAI call.
4. **Cache miss:** Call OpenAI as today; on success, store `(key, original_phrase, response, created_at)` in D1; return response to client.

Optional: TTL (e.g. evict entries older than 90 days) via a periodic job or on-read “lazy” expiry.

---

## 6. Request Flow (word-level, optional phase 2)

1. Tokenize the selected phrase into a list of words (same tokenizer used for cache keys).
2. Batch lookup in D1 for each word (and optional context_key). Identify cached vs uncached.
3. If all cached: build `wordTable` from cache (order preserved), compose `translatedPhrase` from cached `wordTranslation` values; return without OpenAI.
4. If some uncached: build placeholder phrase and mapping; call OpenAI with placeholder prompt (Option A in §3.2); merge cached wordTable rows with OpenAI wordTable; substitute placeholders in `translatedPhrase`; return. On success, write back new word rows to D1 for future use.

---

## 7. Summary

| Aspect | Phrase-level cache | Word-level cache |
|--------|--------------------|------------------|
| Hit rate | Lower (exact phrase match) | Higher (same word in many phrases) |
| Implementation | Simple: one key, one blob | Complex: tokenizer, merge, placeholder prompt |
| OpenAI “don’t translate” | Not needed | Placeholder substitution (Option A) |
| Cost/latency | Good for repeated phrases | Better once vocabulary cache is warm |
| Recommendation | Implement first | Add later if needed |

**Suggested path:** Introduce a **phrase-level** D1 cache first (normalized phrase as key, full OpenAI response as value). Measure hit rate and cost savings. If you need more savings, add **word-level** caching with a defined tokenizer and the placeholder-based prompt so OpenAI does not re-translate cached words, and merge cached + new wordTable and translatedPhrase in a single, consistent response shape for the client.
