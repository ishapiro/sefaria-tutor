# Concordance Word Explorer — Design Document

## Overview

**Concordance Word Explorer** (formerly “Root Explorer / Word Trees”) is a feature that works like a **concordance**: it shows how a single Hebrew root (*shoresh*) appears across different books of the Bible or genres of text. For example, students can see how the root **ק־ד־שׁ** (K-D-Sh: holy, sanctify) appears in Vayikra (Leviticus) versus Tehillim (Psalms)—different word forms, binyanim, and contexts—in one visual, explorable view.

This supports the product goal of helping students move from “reading along” to owning the text by reinforcing root-based thinking and cross-text connections. It aligns with the existing **Root Explorer** item on the roadmap (EDUCATOR-OVERVIEW.md, FUTURE-FEATURES.md).

**Initial scope:** Root Explorer is supported **only** from two entry points—the **translation modal** (word-by-word dialog) and the **My Word List** portal. There is no standalone "Root Explorer" item in the top navigation in the initial release. A **tree icon** in each word card in both places opens the Root Explorer for that word's root.

**Roots (shoresh):** In Hebrew, a root is a consonantal pattern that underlies both verbs and nouns (e.g. ק־ד־שׁ gives verbs like הִקְדִּישׁ and nouns like מִקְדָּשׁ). The feature accepts any valid shoresh; the AI supplies `wordRoot` for both verbs and nouns in the word table, and the tree shows all matching forms regardless of part of speech.

---

## 1. User Flow Summary

| Actor | Action | Outcome |
|-------|--------|---------|
| **User** | Clicks tree icon on a word card (translation dialog or My Word List) | Root Explorer opens with that word's root pre-filled and tree loaded (or ready to build) |
| **User** | (If opened without a root) Enters or selects a root (e.g. ק־ד־שׁ or K-D-Sh) | Root normalized; optional preview of “this root means …” |
| **User** | Chooses scope: “Compare books” or “Compare genres” | Scope drives which branches the tree shows |
| **User** | Selects books (e.g. Leviticus, Psalms) or genres (e.g. Torah, Prophets, Writings) | Tree loads: root → branches per book/genre → word forms → refs |
| **User** | Expands a branch (e.g. Vayikra) | Sees word forms (קדש, הקדיש, מקדש, …) and sample refs |
| **User** | Clicks a ref or “Open in text” | Navigates to that verse/section in the main text explorer |
| **User** | Clicks “Explore this root” from word-by-word dialog | Root Explorer opens with that root pre-filled and tree loaded |
---

## 2. Concept: What Is a “Word Tree”?

A **Word Tree** is a hierarchical visualization:

1. **Root (trunk):** One shoresh in a consistent notation (e.g. **ק־ד־שׁ** with optional transliteration and core meaning).
2. **Branches (first level):** Either **books** (e.g. Vayikra, Tehillim, Bereishit) or **genres/categories** (e.g. Torah, Nevi’im, Ketuvim, Talmud).
3. **Sub-branches (optional second level):** Word forms and/or grammatical info (e.g. verb binyan, noun/verb, specific form).
4. **Leaves:** Specific occurrences—Hebrew word, translation, and **source ref** (e.g. Leviticus 19:2, Psalms 29:2). Clicking a leaf opens the source in the main reader.

**Example (conceptual):**

```
                    ק־ד־שׁ (holy, sanctify)
                    /    |    \
              Vayikra  Tehillim  Bereishit
                 |        |          |
           קדושים  הקדיש   מקדש   ויקדש
           (holy)  (sanctified) (sanctuary) (and he sanctified)
             |        |          |          |
          Lev 19:2  Ps 29:2   ...        Gen 2:3
```

The tree answers: *“Where does this root show up, and how does it look in different books or genres?”*

---

## 3. UI / Layout Design

### 3.1 Entry Points (Initial Release — Two Only)

Root Explorer is **not** in the top navigation in the initial release. Access is only from word cards in these two places:

1. **Translation modal (word-by-word dialog)**  
   In each word card that has a root (`wordRoot` present and not "—"), add a **tree icon** (e.g. 🌳 or a simple tree graphic) in the word card, next to the root/metadata row. Clicking the icon opens the Root Explorer view (page or modal) with that root pre-filled and scope defaulted (e.g. "Compare books: whole Tanakh" or last-used scope in localStorage).

2. **My Word List portal**  
   In each word card in the My Word List modal, add the same **tree icon** in the word card when that word has a root (`wordEntry.wordRoot` present and not "—"). Clicking the icon opens Root Explorer with that word's root pre-filled.

- **Tree icon placement:** In the word card, place the tree icon in the same row as the root (e.g. next to "ר־א־ש (head, beginning)") so it is clearly an action for "explore this root." Use a single, consistent icon across both entry points. Tooltip/label: e.g. "Word tree" or "Explore root."
- **No root:** If a word has no root (or root is "—"), do not show the tree icon for that card.


### 3.2 Word Card — Tree Icon

- **Location:** Inside each word card, in the row that shows the root (and translation/metadata), right-aligned or adjacent to the root text.
- **Visual:** A single tree icon (e.g. outline tree or small graphic). Same icon and size in both the translation dialog and the My Word List.
- **Visibility:** Only when the word has a root: `wordRoot` exists and is not "—".
- **Accessibility:** `aria-label` e.g. "Open word tree for this root"; keyboard focusable.

**Translation dialog — sketch:**

```
│  ┌──────────────────────────────────────────────────────┐   │
│  │ בְּרֵאשִׁית  Beginning  Root: ר־א־ש (head)      [🌳]  │   │
│  │ Noun, Feminine                                        │   │
│  └──────────────────────────────────────────────────────┘   │
```

**My Word List — sketch:** Same pattern: root (and optional translation) row includes the tree icon when the saved word has a root.

### 3.3 Root Explorer Page / View

**Layout (single scrollable page or dedicated route):**

```
┌─────────────────────────────────────────────────────────────────────────┐
│ Concordance Word Explorer                                               │
├─────────────────────────────────────────────────────────────────────────┤
│                                                                         │
│  Root (shoresh):  [ ק־ד־שׁ ]  or  [ K-D-Sh ]     [Go]  [Clear]         │
│  (Optional: “Core meaning: holy, sanctify” from cache or first load)    │
│                                                                         │
│  Compare by:  ( ) Books   ( ) Genres                                    │
│                                                                         │
│  Scope:  [▼ Tanakh only ]   or multi-select: [Vayikra] [Tehillim] ...   │
│          (Presets: “Torah”, “Nevi’im”, “Ketuvim”, “All Tanakh”)         │
│                                                                         │
│  [Build Tree]                                                            │
│                                                                         │
├─────────────────────────────────────────────────────────────────────────┤
│  Word Tree                                                              │
│  ┌───────────────────────────────────────────────────────────────────┐ │
│  │  ק־ד־שׁ  (holy, sanctify)                                          │ │
│  │    ├─ Vayikra (Leviticus)                                          │ │
│  │    │    ├─ קדושים — holy (adj) — Lev 19:2, 20:26, ...              │ │
│  │    │    ├─ והתקדשתם — you shall be holy — Lev 20:7                  │ │
│  │    │    └─ ...                                                     │ │
│  │    ├─ Tehillim (Psalms)                                            │ │
│  │    │    ├─ הקדיש — sanctified — Ps 29:2                            │ │
│  │    │    └─ ...                                                     │ │
│  │    └─ Bereishit (Genesis)                                          │ │
│  │         └─ ויקדש — and He sanctified — Gen 2:3                     │ │
│  └───────────────────────────────────────────────────────────────────┘ │
│                                                                         │
│  (Each ref is a link: “Open in text” → navigates to book + section)     │
└─────────────────────────────────────────────────────────────────────────┘
```

- **Root input:** Accept Hebrew (with or without maqaf, e.g. ק־ד־שׁ or קדש) or Latin transliteration (e.g. K-D-Sh, KDSH). Normalize to a canonical 3- or 4-letter root for display and API (see Data & API section).
- **Compare by:** Toggle or radio: **Books** (e.g. Vayikra, Tehillim) vs **Genres** (e.g. Torah, Nevi’im, Ketuvim, Talmud). Genres map to Sefaria categories already used in the app.
- **Scope:** Restrict which books or categories are included (e.g. “Tanakh only”, “Torah only”, or a multi-select of specific books). Presets reduce friction.
- **Build Tree:** On submit, show loading state then render the tree. Empty state: “No occurrences found for this root in the selected scope. Try a different root or scope.”

### 3.4 Tree Interaction

- **Expand/collapse:** First level (book/genre) and optionally second level (word form) expandable. Default: first level expanded, second level collapsed or “Show N forms” summary.
- **Refs:** Each occurrence shows a short ref (e.g. “Lev 19:2”). Click → open main text explorer at that book and section (reuse existing navigation: `selectedBook` + section ref).
- **Tooltip or side panel:** On hover/click of a word form, optional short hint: translation, binyan, part of speech (from cache or first-time analysis).

### 3.5 Responsive & Accessibility

- Tree works on mobile as stacked blocks or accordions if horizontal tree doesn’t fit.
- RTL respected for Hebrew; root and word labels use existing app Hebrew styling.
- Keyboard: focusable “Build Tree”, expand/collapse, and ref links; aria-labels for screen readers (“Word tree for root K-D-Sh”, “Occurrence Leviticus 19:2”).

---

## 4. Data Strategy & Sources

Word Trees require **occurrences of a root in a given set of books or categories**. Options:

### 4.1 Option A — Sefaria Search API (recommended for v1)

- Use Sefaria’s **text search** (e.g. `POST /api/search-wrapper`) with a **Hebrew root** query and **path filters** so results behave like a **concordance** for the selected scope (e.g. Tanakh only).
- **Concordance behavior:** Request uses `filters` + `filter_fields` on the `path` field (e.g. `Tanakh/Torah`, `Tanakh/Prophets`, `Tanakh/Writings` for scope Tanakh). This restricts hits to the chosen corpus so we get hundreds of in-scope occurrences instead of a mix of commentary/dictionary. Search size is increased (e.g. 500) to support concordance-style coverage.
- For a root like ק־ד־שׁ, search the **consonantal root string** (e.g. קדש) with `field: naive_lemmatizer` so Sefaria returns segments containing that root in any form (verbs, nouns, etc.).
- **Limitations:** Search is by form/lemmatizer, not by morphological root; we may get false positives or miss some forms. Acceptable for v1.
- **Response:** Ref + snippet per hit. We **group by book or genre** (scopeType). Each occurrence shows the root; actual word form at the ref can be inferred from snippet when needed.

### 4.2 Option B — Translation Cache + Word List (complementary)

- **Translation cache** and **word list** already store `wordRoot` per word. We can aggregate:
  - All phrases that contain at least one word with `wordRoot = ק־ד־שׁ` (normalized).
  - Group by `bookTitle` or `sourceRef` → book.
- **Pros:** Real grammatical data (binyan, part of speech, translation); no extra search API. **Cons:** Only covers phrases users have already looked up; sparse for rare roots or books.
- **Use case:** Enrich the tree with “From your lookups” section, or use as fallback when Sefaria search is unavailable.

### 4.3 Option C — Pre-built Root Index (future)

- Offline or background job: run morphology (or use an existing Hebrew morphology engine) over Sefaria text and index (root → ref, word form, binyan). Then Word Trees query this index.
- **Pros:** Accurate, fast, full coverage. **Cons:** Significant engineering (morphology integration, indexing pipeline, storage). Defer to a later phase.

### 4.4 Recommended v1 Approach

- **Primary:** Sefaria search with root-derived Hebrew queries (Option A). Normalize root to letters (e.g. קדש), run one or a few search queries (e.g. root + 1–2 common patterns), filter results by requested books/categories, then group by book/genre and by word form (heuristic from snippet or first word of segment).
- **Enrichment (optional):** If user is logged in, merge in occurrences from translation cache + word list for that root (Option B), labeled e.g. “Also in your lookups.”
- **Root meaning:** Prefer translation cache / word list for “core meaning” (e.g. “holy, sanctify”); else show a short placeholder (“Root ק־ד־שׁ”) until we have a small root-glossary or API.

---

## 5. Data Model (Client & API)

### 5.1 Root Notation

- **Canonical display:** 3 (or 4) letters with maqaf, e.g. `ק־ד־שׁ`. Stored and compared in a **normalized** form: letters only, e.g. `קדש`, for API and grouping.
- **Input parsing:** Accept `ק־ד־שׁ`, `קדש`, `K-D-Sh`, `KDSH`; normalize to Hebrew letters and then to canonical form (e.g. 3-letter root).

### 5.2 Tree Response (API)

Proposed shape for the response that drives the Word Tree:

```ts
interface WordTreeResponse {
  root: string              // Canonical root, e.g. "ק־ד־שׁ"
  rootMeaning?: string     // e.g. "holy, sanctify"
  scope: 'books' | 'genres'
  branches: WordTreeBranch[]
}

interface WordTreeBranch {
  key: string               // Book key (e.g. "Leviticus") or category (e.g. "Torah")
  title: string             // Display title (e.g. "Vayikra (Leviticus)")
  heTitle?: string
  occurrences: TreeOccurrence[]
}

interface TreeOccurrence {
  word: string              // Hebrew word form
  translation?: string
  partOfSpeech?: string
  binyan?: string | null
  ref: string               // Sefaria ref, e.g. "Leviticus_19.2"
  displayRef: string        // e.g. "Lev 19:2"
  snippet?: string         // Optional short context
}
```

- **Grouping by word form:** Optional. Server can group `occurrences` by `word` (or by `word` + `partOfSpeech`) so the UI can show sub-branches (e.g. “קדושים” with count and refs). If not grouped, UI can group client-side.

### 5.3 Caching

- Cache tree results by `(normalizedRoot, scope, scopeValue)` for a TTL (e.g. 24 hours) to avoid repeated Sefaria search for the same query. Store in existing cache layer (e.g. D1 or KV) if available.

---

## 6. API Endpoints

### 6.1 Public (no auth required for v1)

| Method | Path | Purpose |
|--------|------|---------|
| GET or POST | `/api/root-explorer/tree` | Build and return Word Tree for a root and scope |

**Request (e.g. POST body or query):**

- `root`: string (Hebrew or transliteration; server normalizes)
- `scope`: `'books' | 'genres'`
- `scopeValue`: string or string[] — e.g. `"Tanakh"`, `"Torah"`, or `["Leviticus", "Psalms"]` for books

**Response:** `WordTreeResponse` as above.

**Errors:** 400 if root missing/invalid; 502/503 if Sefaria search fails (with user-friendly message).

### 6.2 Optional (logged-in user)

- `GET /api/root-explorer/tree?root=...&includeUserLookups=1` — when authenticated, include occurrences from translation cache + word list for this root (Option B). Requires joining with phrase cache and word list by `user_id` and matching `wordRoot`.

---

## 7. Integration with Existing App

### 7.1 Navigation (Initial Release)

- **Do not** add a "Root Explorer" (or "Word Trees") item to the top navigation in the initial release. Root Explorer is reached only via the tree icon on word cards in the translation modal and in the My Word List portal.
- Root Explorer is shown as a dedicated route (e.g. `/root-explorer`) or as a full-screen overlay/modal when the user clicks the tree icon. The route can still accept a query param `root=` for pre-filling when opened from a word card.

### 7.2 Tree Icon — Translation Dialog

- In **WordExplorerTranslationDialog**, for each word card (word row) that has `wordRoot` and `wordRoot !== '—'`, add a **tree icon** in the word card (same row as the root, e.g. right-aligned).
- Click: navigate to `/root-explorer?root=<encoded wordRoot>` (e.g. `ק־ד־שׁ` URL-encoded), or open the Root Explorer view with that root pre-filled. Optionally auto-trigger **Build Tree** with default scope (e.g. Tanakh, or last-used scope in localStorage).

### 7.3 Tree Icon — My Word List

- In the **My Word List** portal (e.g. `WordListModal.vue` or equivalent), for each word card that has `wordData.wordEntry.wordRoot` present and not "—", add the same **tree icon** in the word card (e.g. in the row that shows the root).
- Click: same behavior as translation dialog — open Root Explorer with that word's root pre-filled.

### 7.4 Opening a Ref in the Main Text

- Tree refs use the same ref format the app already uses (e.g. `Genesis_1.1`, `Leviticus_19.2`). Reuse existing logic:
  - Resolve ref to a **book** (from Sefaria index/categories) and **section**.
  - Set `selectedBook` and load that book’s TOC, then navigate to the section (e.g. `fetchBookContent(ref)` or equivalent). If the app uses a router, consider `router.push({ path: '/', query: { book: ..., ref: ... } })` and have the index page read query and open the book + section.

### 7.5 Books & Genres

- **Books:** Use the same Sefaria category/index data the app already loads (e.g. list of books under Tanakh). For “Compare by books”, allow multi-select of books from that list (e.g. Leviticus, Psalms, Genesis).
- **Genres:** Map to Sefaria **categories** (e.g. Torah, Nevi’im, Ketuvim, Talmud). Scope filter for search: restrict Sefaria search results to those categories (via `filters` / `filter_fields` if the search API supports it).

---

## 8. Edge Cases & Considerations

### 8.1 Root Validation

- Reject empty or non-Hebrew (and invalid transliteration). Accept 3- and 4-letter roots. Normalize spelling (e.g. ו vs. י in roots) per a simple table or heuristic if needed; document limitations.

### 8.2 No Results

- Show: “No occurrences found for this root in the selected scope.” Suggest trying another scope (e.g. “All Tanakh”) or checking the root spelling.

### 8.3 Rate Limits & Performance

- Sefaria search may rate-limit. Cache tree results (see 5.3). Consider a single combined query or batched queries per tree build to minimize calls.

### 8.4 RTL and Hebrew Typography

- Root and word forms displayed RTL; tree structure (branches) can stay LTR for “Book → forms → refs” flow, or full RTL if design prefers. Keep refs and “Open in text” in the same direction as the rest of the app.

### 8.5 Future: Saved Trees / Favorites

- If we add user-specific features later, consider “Save this tree” or “Favorite root” (root + scope stored per user) for quick access.

---

## 9. Phased Implementation

### Phase 1 — MVP

- **Entry points only:** Translation modal and My Word List. **Tree icon** in each word card (when the word has a root); no Root Explorer link in top navigation.
- Root Explorer page/view: root input (Hebrew + transliteration), scope (books vs. genres), scope selector (Tanakh presets + book multi-select). Root can be pre-filled via query param when opened from a word card.
- Backend: one endpoint that calls Sefaria search with root-based Hebrew query(s), filters by scope, groups by book/genre, returns `WordTreeResponse`.
- UI: Simple tree (expandable branches by book/genre; list of occurrences with ref links). "Open in text" navigates to main reader.
- Translation dialog: tree icon in word card → Root Explorer with that root pre-filled. My Word List: tree icon in word card → Root Explorer with that word's root pre-filled.

### Phase 2

- Group occurrences by word form (sub-branches); show translation/binyan from cache when available.
- Optional: include “From your lookups” when logged in (translation cache + word list).
- Caching of tree results (D1 or KV).

### Phase 3 (optional)

- Pre-built root index (Option C) for accuracy and coverage.
- Saved/favorite roots per user; “Recent roots” for quick access.

---

## 10. File Structure (Proposed)

```
pages/
  root-explorer.vue          # or word-trees.vue — Root Explorer page

components/
  RootExplorer/              # or WordTrees/
    RootInput.vue            # Root input + normalization hint
    ScopeSelector.vue        # Books vs genres, scope value
    WordTree.vue             # Tree visualization (expand/collapse, ref links)

server/
  api/
    root-explorer/
      tree.get.ts            # GET /api/root-explorer/tree?root=...&scope=...
      # or tree.post.ts for POST body

server/utils/
  rootNormalize.ts           # Normalize root (Hebrew/transliteration → canonical)
  # optional: sefariaSearchRoot.ts — build query and parse results for a root
```

---

## 11. Success Criteria

- **Entry:** Root Explorer is reachable only from the translation modal and the My Word List. A tree icon appears in each word card that has a root (in both places).
- From the translation dialog or My Word List, clicking the tree icon on a word card opens Root Explorer with that word's root pre-filled; the user can build the tree and use it immediately.
- Students can (from that view) choose "Compare by books" or genres, select scope (e.g. Vayikra and Tehillim), and see a tree of word forms and refs for that root.
- Clicking a ref in the tree opens the corresponding verse/section in the main text explorer.
- Tree loads within a few seconds for typical roots and scope (Tanakh or 2–3 books); empty state and errors are clear and actionable.

---

## 12. References

- **EDUCATOR-OVERVIEW.md** — Root Explorer on roadmap; Shoresh (root) in word-by-word analysis.
- **FUTURE-FEATURES.md** — Root (Shoresh) Explorer: “grouping words by lexical root… same root across texts and contexts.”
- **WORD-LIST-FEATURE-DESIGN.md** — Word data structure (`wordRoot`, `wordRootTranslation`), source ref, book title; reuse for “From your lookups.”
- **Translation cache / OpenAI chat** — `wordTable` with `wordRoot`, `wordRootTranslation`; used for enrichment and root meaning.
- **Sefaria API** — Search (e.g. search-wrapper, Elastic Search proxy); categories/index for books and genres.
