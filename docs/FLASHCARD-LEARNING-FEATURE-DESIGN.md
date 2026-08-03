# Flashcard / Interactive Learning Feature — Design Document

## Overview

This document describes the design for a **flashcard-style, interactive learning feature** that helps logged-in users reinforce vocabulary from their **My Word List**. The feature uses language-learning best practices (spaced repetition, active recall, immediate feedback) and is available only when the user is logged in.

A key design requirement is that **users can remove a word from their list** (or otherwise take it “off” the list) without breaking the feature. This document recommends **switching from permanent delete to archive** in My Word List: replace the current "Delete" action with "Archive" so the row is retained with `archived_at` set, preserving referential integrity and allowing restore. No permanent delete in normal user flow for v1.

**Tracking and settings:** The design includes **per-word tracking** (times shown, times correct, attempts until first correct) and a **user settings** capability. A new setting **“Repeat correct words (times)”** controls how many times a word is shown again after the user marks it “Know it” before retiring it for the session, reinforcing learning. Other hardcoded values in the app are identified as optional candidates for the same user settings table.

**TTS:** Pronunciation is available via the **existing TTS API** (`POST /api/openai/tts`). The flashcard card should reuse the same pattern as the translation table (see Section 4.5 and TranslationDialog / `playWordTts` in the codebase).

---

## 1. Goals and Constraints

### 1.1 Goals

- Help users **reinforce** words they have saved in My Word List through interactive practice.
- Use **evidence-based language learning techniques**: active recall, spaced repetition, immediate feedback, retrieval practice.
- Keep the feature **simple** to build and maintain (no external flashcard engine required for v1).
- Ensure that **removing a word from the list** does not break the flashcard experience (no orphaned references, no crashes, predictable behavior).

### 1.2 Constraints

- **Logged-in only:** The feature is gated on the same auth as My Word List (`loggedIn` and appropriate role). No flashcards for anonymous users.
- **Source of truth:** Words come from the user’s **My Word List** only. No separate “flashcard deck”;
  the deck is the current, non-archived word list.
- **Remove-word behavior:** Users must be able to “take a word off” their list. The design must define how this interacts with flashcards (e.g., archived words are excluded from study) and whether delete should become archive (recommended below).

---

## 2. Recommendation: Archive Instead of Delete

### 2.1 The Problem with Hard Delete

Today, “Delete” in My Word List **permanently removes** the row from `user_word_list`. That is simple but has drawbacks once flashcards exist:

- **Referential integrity:** Any future table that references `user_word_list.id` (e.g. flashcard progress, “next review” dates, or session state) would point to a row that can disappear. Deleted words would leave orphaned references or require complex cleanup.
- **User expectation:** Some users may think “remove from list” means “hide from my list but keep my progress.” Hard delete does not allow that.
- **Recovery:** Users cannot undo; the word and any association to it are gone.

### 2.2 Recommendation: “Archive Word” Instead of “Delete Word”

**Recommendation:** Treat “remove from my list” as **archiving**, not permanent deletion.

- **Semantics:** “Archive” = remove from the active list and from flashcard decks; the row stays in the DB with an `archived_at` timestamp.
- **My Word List UI:** Replace the current “Delete” action with **“Archive”** (or “Remove from list” with tooltip: “Word will be archived and removed from your list and study deck. You can restore it later.”). Optional: add an “Archived” filter or section so users can restore words.
- **Flashcards:** Only words with `archived_at IS NULL` are included in the study deck. If a word is archived **during** a session, the implementation skips it when it would next appear (or treats it as “removed from deck” for that session).
- **Referential integrity:** All references to `user_word_list.id` (e.g. progress, scheduling) continue to point to an existing row. No orphans.
- **Restore (optional):** A “Restore” action in an “Archived” view sets `archived_at = NULL` so the word reappears in My Word List and in future flashcard decks.

### 2.3 Implementation Impact (Design-Level)

- **Schema:** Add nullable `archived_at INTEGER` (Unix timestamp) to `user_word_list`. Existing rows are “active” (`archived_at IS NULL`).
- **APIs:**
  - **GET /api/word-list:** Filter to `WHERE user_id = ? AND (archived_at IS NULL)` for the main list (and optionally support `?archived=1` for archived-only).
  - **DELETE /api/word-list/[id]:** Replace with **PATCH /api/word-list/[id]** (or keep DELETE and repurpose it): set `archived_at = unix_now()` instead of deleting the row. Switch to archive from permanent delete — no permanent delete in v1.
- **UI:** Replace “Delete” with “Archive” (or “Remove from list”) in the My Word List modal; confirmation copy can say “Archive this word? It will be removed from your list and study deck.”
- **Backward compatibility:** Migration adds `archived_at` as NULL; all existing rows remain active. No breaking change for existing clients if they ignore the new field until UI is updated.

This recommendation is part of the **implementation of the new flashcard feature** so that “remove word” is well-defined and does not break the system.

---

## 3. User Experience (High Level)

### 3.1 Entry Point

- **Primary:** From **My Word List** modal: a prominent **“Study”** (or “Flashcards”) button. Only visible when the user is logged in and the word list is available. If the list is empty (or all archived), the button is disabled with a short explanation (“Add words to your list to study”).
- **v1:** There is no top-level “Study” in the header; entry is only from the My Word List modal.

### 3.2 Flow

1. User opens My Word List and clicks **“Study”** (or “Flashcards”).
2. App loads the **active** word list (non-archived). **Default session size is 20 words:** the initial study deck is the first 20 active words (or fewer if the list has fewer). If fewer than one word, show an empty state and do not start a session.
3. **Study session:** Words are presented one-by-one as flashcards (see Section 4). **v1: Hebrew → English only.** Each time a word is shown, **times shown** is recorded; when the user marks “Know it,” **times correct** is recorded and the word is shown again a configurable number of times (“correct-word repetitions”) before being retired for the session. User can flip the card, then rate themselves (“Know it” / “Need practice”) and get immediate feedback.
4. Session can end when: user finishes a round, user clicks “End session,” or there are no more words to show. **Show a session summary (v1):** (e.g. “You reviewed 12 words,” or stats like “X words shown, Y correct”).
5. Archive is **not** available from the flashcard UI in v1 (see §3.3). If the user archives a word from **My Word List** (e.g. in another tab), that word is excluded from future sessions. The session uses a snapshot of active word IDs at start, so no mid-session archive handling is required.

### 3.3 Removing a Word (Archive) — Only from My Word List

- **v1: Do not allow archive from the flashcard UI.** Archive/remove-from-list is available only in the **My Word List** modal. This keeps implementation simpler (no mid-session skip logic or archive button on the card).
- **From My Word List:** Archiving a word removes it from the list and from **future** study decks. The session uses a snapshot of active word IDs at start, so if a word is archived elsewhere during a session it simply won't be in the next session’s deck.

No feature should assume a word list row still exists after a “remove” action; by using archive, the row **does** still exist, so any progress or history tied to that `id` remains valid.

---

## 4. Language Reinforcement Techniques (Applied in Design)

### 4.1 Active Recall

- **v1: Hebrew → English only.** Show the Hebrew word (and optional context phrase); user recalls the English meaning (mentally or by typing). Then reveal the answer and show correctness. English → Hebrew is out of scope for v1.

### 4.2 Spaced Repetition and Correct-Word Repetitions (v1)

- **v1 approach:** No full SM-2 or Leitner implementation is required.
  - **“Need practice”** → word reappears later in the same session (e.g. after N cards) and/or is prioritized at the start of the next session.
  - **“Know it”** → word is **not** retired immediately. The user has a setting: **“Correct-word repetitions”** (see Section 6.5). After the user marks “Know it,” the word is shown again that many times in the same session to reinforce learning; only after that many additional correct views is the word retired for the session.
  - Example: setting = 2 → user marks “Know it” → show the word 2 more times (each time they can confirm again or change to “Need practice”) → then retire for the session.
- **Tracking (see Section 6.4):** Persist **times shown** and **times correct** per word; optionally **attempts until first correct**. Use this for analytics and future SRS.
- **Future:** Add a `next_review_at` (and optionally `interval`, `ease_factor`) per word or per `user_word_list.id` in a separate table, and filter “due” words for each session. Archive does not break this: archived words are excluded from “due” queries.

### 4.3 Immediate Feedback

- After the user reveals the answer or submits a response, show **correct/incorrect** (if applicable) and the **full correct answer** (word, translation, root, optional grammar snippet).
- Optionally allow a **self-rate** only (“Know it” / “Need practice”) without strict correct/incorrect for v1, and still show the full answer for reinforcement.

### 4.4 Retrieval Practice

- Design the flow so that the **default** is “see prompt → try to recall → then see answer.” Avoid “show both sides at once” as the default to strengthen retrieval.

### 4.5 Multimodality — TTS (Available)

- **TTS is available** in the app via the existing TTS API. The flashcard card UI should offer a “Play” (🔊) button for the Hebrew word to reinforce the sound–meaning link.
- **Implementation reference:** Reuse the same pattern as the **translation table** (word-by-word translation dialog):
  - **API:** `POST /api/openai/tts` with body `{ text: string }` (Hebrew word or phrase). Returns audio (e.g. MP3); client plays via `Audio` / `URL.createObjectURL(res.blob())`.
  - **UI pattern:** In the translation dialog, clicking a Hebrew word triggers TTS (see **TranslationDialog.vue**: `play-word-tts` / `play-phrase-tts` emits; **pages/index.vue**: `playWordTts(word)` calls the TTS API and plays the result). The same `playWordTts`-style call with the card’s Hebrew word should be used on the flashcard “Play” button.
  - **Server:** `server/api/openai/tts.post.ts` — uses pronunciation cache (R2 + D1) when possible, then OpenAI TTS; no new backend required for flashcards.

### 4.6 Session Length and Fatigue

- Allow **short sessions:** e.g. “Study 5 / 10 / 20” or “All” so users can do a quick drill. Avoid forcing a long session. When the user clicks "Study," the initial deck is the first 20 active words (or fewer if the list has fewer). Optional later: "Study 5 / 10 / 20 / All" and/or a user setting for default cap (see Section 6.5).

---

## 5. UI/UX Design (Wireframe-Level)

### 5.1 My Word List Modal — Addition

```
┌─────────────────────────────────────────────────────────────┐
│ My Word List                                          [×]  │
├─────────────────────────────────────────────────────────────┤
│  🔍 [Search words...                    ]                   │
│  Total: 15 words    [  Study  ]   ← NEW BUTTON              │
├─────────────────────────────────────────────────────────────┤
│  ┌──────────────────────────────────────────────────────┐  │
│  │ Genesis 1:1                                           │  │
│  │ בְּרֵאשִׁית  ·  Beginning  ·  Root: ר-א-ש             │  │
│  │                        [Archive]  ← RENAMED (was Delete)│  │
│  └──────────────────────────────────────────────────────┘  │
│  ...                                                        │
└─────────────────────────────────────────────────────────────┘
```

- **Study button:** Primary-style button; disabled with tooltip if 0 active words.
- **Archive:** Same placement as current Delete; confirmation: “Archive this word? It will be removed from your list and study deck. You can restore it from Archived.”

### 5.2 Study Session — Card Flow

```
┌─────────────────────────────────────────────────────────────┐
│  Study: My Words                                    [End]   │
│  Card 3 of 12  (Hebrew → English)                           │
├─────────────────────────────────────────────────────────────┤
│                                                             │
│            ┌─────────────────────────────┐                  │
│            │                             │                  │
│            │         בָּרָא              │                  │
│            │                             │                  │
│            │   [Show translation]        │                  │
│            └─────────────────────────────┘                  │
│                                                             │
│   [Play 🔊]  (reuse existing TTS — see §4.5)   (Optional: Show context phrase)     │
└─────────────────────────────────────────────────────────────┘
```

After “Show translation” (or after user self-rates):

```
┌─────────────────────────────────────────────────────────────┐
│            ┌─────────────────────────────┐                  │
│            │  בָּרָא  →  created          │                  │
│            │  Root: ב־ר־א · Verb, Qal    │                  │
│            └─────────────────────────────┘                  │
│                                                             │
│        [Need practice]        [Know it]                      │
│                                                             │
│        [Next card →]                                        │
└─────────────────────────────────────────────────────────────┘
```

- **Prompts:** Hebrew word prominent; optional short context phrase (e.g. from `originalPhrase`) in smaller text.
- **Feedback:** Show translation, root, and key grammar after reveal.
- **Actions:** “Need practice” / “Know it” drive simple spacing (and future SRS); “Next” advances. “End” ends the session.

### 5.3 Empty and Edge States

- **No words:** “Add words to your list to study.” Link or button to close and add words from the reader.
- **All archived:** Same as no words for “Study” (only active words count).
- **Session in progress, user archives a word:** That word is skipped for the rest of the session (or never drawn again in that session). No error; no reference to a missing row.

### 5.4 Optional: Archived Words Section

- In My Word List, a tab or filter “Archived” with a list of archived words and a **“Restore”** action per word. Restore sets `archived_at = NULL`. No code required in this design phase; just the product intent.

### 5.5 User Setting: “Repeat correct words (times)”

- **Where to expose:** Either (a) a **Study options** area when starting a session (e.g. “Repeat correct words: [0] [1] [2] [3]” with 2 as default), or (b) a general **Settings** page/section (e.g. “Flashcards” subsection with “Repeat correct words (times): 2”). For v1, (a) keeps the setting close to the action; (b) is better if the app gains more settings.
- **Label (reworded):** Prefer **“Repeat correct words (times)”** or **“Show each correct word again ___ time(s) before retiring.”** Tooltip or help: “After you mark a word as ‘Know it,’ we’ll show it this many more times in the session to reinforce learning.”
- **Values:** 0 = retire immediately after “Know it”; 1, 2, 3 = show that many times again before retiring. Default 2.

---

## 6. Data and API (Design Only)

### 6.1 Source of Words

- **GET /api/word-list** (with `archived_at IS NULL` filter) returns the active list. Flashcards use this list (or a subset for “Study 5/10/20”).
- No new “flashcard deck” table for v1; the deck is derived from the active word list at session start.
- Optional later: a small **progress** or **scheduling** table keyed by `user_word_list.id` (and user_id). Archive does not break this: queries join to `user_word_list` and filter `archived_at IS NULL`, so archived words are simply excluded from “due” sets.

### 6.2 Session State and Correct-Word Repetitions

- **Deck and queue:** At session start, build the deck from the active word list; **default is first 20 words** (or fewer if list has fewer). Maintain in-session state:
  - **Need practice:** Words the user marked “Need practice” re-enter the queue to be shown again (e.g. after N cards or at end of round).
  - **Know it:** When the user marks “Know it,” do **not** retire the word yet. Look up the user setting **Correct-word repetitions** (e.g. 2). Show this word again that many times in the session; after each show, the user can confirm “Know it” again or say “Need practice.” After the word has been shown the required number of times *after* the first “Know it,” retire it for the session.
- **Persistence:** Each time a word is **shown**, persist “times shown” for that word (see Section 6.4). Each time the user marks **“Know it”**, persist “times correct.” Optionally record “attempts until first correct” the first time they mark “Know it” for that word (using current times_shown as the value). So session state is in-memory for “correct repetitions remaining” and “need practice” queue; progress stats are persisted to the DB.
- If the user refreshes, the session ends; next “Study” starts a new session from the current active list. All progress (times_shown, times_correct) is already saved.

### 6.3 Archive API (Recommended)

- **PATCH /api/word-list/[id]**  
  Body: `{ "archived": true }` (or `"archived": false` for restore).  
  Server sets `archived_at = now()` or `archived_at = NULL`, and returns the updated entry.
- **GET /api/word-list**  
  Default: only active words. Query `?archived=1` returns only archived words for “Archived” view.
- **Permanent delete (optional):** If desired later, a separate admin or “Delete permanently” action can run `DELETE FROM user_word_list WHERE id = ? AND user_id = ?`. Normal “Archive” does not delete.

### 6.4 Per-Word Progress (Tracking)

- **Purpose:** Reinforce learning (correct-word repetitions) and support future SRS; provide visibility into how often a word has been shown and how many times the user got it correct.
- **New table: `word_list_progress`** (or `flashcard_progress`), keyed by user and word list entry:

| Column | Type | Description |
|--------|------|-------------|
| `user_id` | TEXT NOT NULL | FK to `users.id` |
| `word_list_id` | INTEGER NOT NULL | FK to `user_word_list.id` |
| `times_shown` | INTEGER NOT NULL DEFAULT 0 | Total number of times this word has been shown in any study session |
| `times_correct` | INTEGER NOT NULL DEFAULT 0 | Total number of times the user marked this word “Know it” (or got it correct) |
| `attempts_until_first_correct` | INTEGER NULL | The value of `times_shown` the first time the user marked “Know it”; NULL until then. Tracks “how many shows until they got it right the first time.” |
| `updated_at` | INTEGER NOT NULL | Unix timestamp of last update |

- **Uniqueness:** One row per (user_id, word_list_id). Create row on first show or first correct.
- **Updates:**
  - Every time the word is **shown** in a session: increment `times_shown`, set `updated_at`.
  - Every time the user marks **“Know it”**: increment `times_correct`, set `updated_at`. If `attempts_until_first_correct` is NULL, set it to the current `times_shown` (so we record “shown N times before first correct”).
- **Archive:** Progress rows reference `user_word_list.id`. When a word is archived, the row remains; queries that build the study deck join to active words only, so progress for archived words is simply unused until the word is restored.
- **APIs:** Either (a) include progress in **GET /api/word-list** response per word (e.g. `progress: { times_shown, times_correct, attempts_until_first_correct }`), or (b) **GET /api/word-list/progress** returning progress keyed by word_list_id; and **PATCH /api/word-list/progress** or a dedicated “record show/correct” endpoint to update after each show or “Know it.” Design prefers (a) for simplicity so the study UI has progress when it loads the list; updates can be sent as small PATCH or POST after each card action.

### 6.5 User Settings Table and Flashcard/App Settings

- **Purpose:** Store per-user preferences so behavior is configurable and hardcoded values can be moved into one place. Required for the flashcard “correct-word repetitions” value; also a good home for other app-wide user preferences identified below.
- **New table: `user_settings`**

| Column | Type | Description |
|--------|------|-------------|
| `user_id` | TEXT NOT NULL | FK to `users.id` |
| `key` | TEXT NOT NULL | Setting key (e.g. `flashcard_correct_repetitions`) |
| `value` | TEXT NOT NULL | Stored value (e.g. `"2"`); app parses to number/boolean as needed |

- **Uniqueness:** One row per (user_id, key). Use REPLACE or INSERT OR REPLACE to upsert.
- **Defaults:** If a key is missing for a user, the app uses a built-in default. No need to pre-populate every key for every user.

#### 6.5.1 Flashcard setting (required for this feature)

| Key | Description | Default | UI label (reworded) |
|-----|-------------|---------|---------------------|
| `flashcard_correct_repetitions` | Number of times to show the word again *after* the user marks “Know it,” before retiring it for the session. Reinforces learning by repeated exposure. | 2 | **“Repeat correct words (times)”** or **“Show correct words again before retiring”** — e.g. dropdown or number input: 0, 1, 2, 3. |

- **Reworded label options (choose one for UI):**  
  - “Repeat correct words (times)”  
  - “Show each correct word again ___ time(s) before retiring”  
  - “Correct-word repetitions”

#### 6.5.2 Other hardcoded values in the app (candidates for this table)

Review of the codebase suggests the following. **Recommendation:** Include **flashcard_correct_repetitions** in v1; add others as needed in v1 or later.

| Key | Current hardcoded value | Location | Recommendation |
|-----|------------------------|----------|-----------------|
| `flashcard_correct_repetitions` | (new) | — | **Include in v1.** See above. |
| `flashcard_session_cap_default` | 5 / 10 / 20 / All (no single default) | Study session UI | **Optional v1:** Default session size when user chooses “Study” (e.g. 10 or 20). |
| `word_list_page_size` | 100 | `pages/index.vue` WORD_LIST_PAGE_SIZE; `server/api/word-list/index.get.ts` DEFAULT_LIMIT 100, MAX 200 | **Optional:** User preference for “Load more” page size. Lower priority. |
| `notes_list_page_size` | 100 | `components/WordExplorer/NotesListModal.vue` PAGE_SIZE | **Optional:** Same as word list; can share one key or separate. Lower priority. |
| `add_to_list_feedback_seconds` | 2.5 | `pages/index.vue` setTimeout 2500 ms for “In List” state | **Optional:** Duration to show “Added” before switching to “In List.” Minor; keep hardcoded unless UX asks for it. |

- **v1 scope:** Implement **user_settings** with at least **flashcard_correct_repetitions**. Add **flashcard_session_cap_default** if the Study UI exposes a default session size; add **word_list_page_size** / **notes_list_page_size** only if product wants user-configurable list size.

#### 6.5.3 API for user settings

- **GET /api/user/settings** — Returns all settings for the current user as `{ key: value }` (or array of `{ key, value }`). Missing keys mean “use app default.”
- **PATCH /api/user/settings** — Body: `{ key: value }` or `{ settings: { key1: value1, ... } }`. Upsert one or more keys for the current user.
- Settings are **logged-in only**; validate auth on every request.

---

## 7. Handling “Remove Word” Without Breaking Implementation

### 7.1 Product Behavior

- **Remove from list** = **Archive** (row stays, `archived_at` set).
- **My Word List** shows only active words by default; “Archived” is optional.
- **Flashcards** use only active words; archived words are excluded from current and future sessions.
- **Mid-session archive:** Session has a snapshot of word IDs (or in-memory list). When deciding “next card,” skip any word that has been archived (e.g. by checking a fresh active list or a flag). **v1: No archive from flashcard UI.** Archive only from My Word List; session uses a snapshot of active word IDs at start, so no mid-session skip logic is needed.

### 7.2 Technical Safety

- **No hard delete** for normal “remove from list” → no orphaned references to `user_word_list.id`.
- **All “study deck” and “progress” queries** filter `archived_at IS NULL`. Archived words never appear in the deck and do not need to be “deleted” from progress; they are simply ignored.
- **Restore** is possible and keeps the same `id`, so any future progress table keyed by that `id` works again once the word is restored.

---

## 8. Summary of Recommendations

| Topic | Recommendation |
|-------|----------------|
| **Remove word** | **Switch to archive from permanent delete.** Replace “Delete” with “Archive”; add `archived_at` to `user_word_list`, filter by `archived_at IS NULL`. No permanent delete in v1. |
| **Referential integrity** | Use archive so that any future flashcard progress or scheduling table can safely reference `user_word_list.id`. |
| **Entry point** | **Study only from My Word List modal** (no header Study in v1). “Study” button in modal; disabled when 0 active words. |
| **Reinforcement techniques** | **v1: Hebrew → English only.** Active recall, immediate feedback, “Know it” / “Need practice”; **correct-word repetitions** (X = user setting). **TTS:** Use existing `POST /api/openai/tts` (see §4.5). Session summary in v1. Optional later: full SRS, English → Hebrew. |
| **Tracking** | **word_list_progress** table: per (user, word_list_id) store **times_shown**, **times_correct**, **attempts_until_first_correct**. Update on each show and on each “Know it.” |
| **User settings** | **user_settings** table (user_id, key, value). Include **flashcard_correct_repetitions** (“Repeat correct words (times)”) in v1; optional: session cap default, word list / notes page size. |
| **Session** | **Default 20 words** per session. Deck = first 20 active words at start; correct-word repetitions; in-session queue for “Need practice”; **no archive from flashcard UI** (archive only from My Word List). |
| **APIs** | GET word-list filters by `archived_at`; include or fetch progress. GET/PATCH user settings. PATCH for archive/restore (no DELETE). PATCH or POST to update progress on show/correct. |
| **Admin: study experiences** | “Study / Flashcards” section in Admin. **Aggregate** over all progress (words shown at least once; include archived). **Notify admin** that figures include archived words. **Per-user** stats; **all-time only** in v1. GET admin/study/stats, GET admin/study/users/:userId. Admin-only. |

---

## 9. Implementation Checklist (Reference Only — No Code Yet)

- [x] **Schema:** Migration adding `archived_at INTEGER NULL` to `user_word_list`; backfill existing rows as NULL.
- [x] **Schema:** New table **word_list_progress** (user_id, word_list_id, times_shown, times_correct, attempts_until_first_correct, updated_at); uniqueness on (user_id, word_list_id).
- [x] **Schema:** New table **user_settings** (user_id, key, value); uniqueness on (user_id, key).
- [x] **APIs:** GET word-list excludes archived by default; optional `?archived=1`. Include progress (times_shown, times_correct, attempts_until_first_correct) per word, or separate GET progress endpoint.
- [x] **APIs:** GET /api/user/settings and PATCH /api/user/settings for user preferences.
- [x] **APIs:** Update progress on each “word shown” and each “Know it” (increment times_shown / times_correct, set attempts_until_first_correct on first correct).
- [x] **APIs:** PATCH (or repurposed DELETE) word-list for archive/restore.
- [x] **My Word List UI:** Replace Delete with Archive; confirmation copy; optional “Archived” view and Restore.
- [x] **Study entry:** “Study” button **only in My Word List modal** (no header Study in v1); disabled when 0 active words. **Default 20 words** per session.
- [x] **Study session UI:** Card view (**Hebrew → English only** in v1), show translation/feedback, “Know it” / “Need practice,” End session. **Session summary** at end. **No archive button** on card.
- [x] **Study session UI:** Expose user setting **“Repeat correct words (times)”** (flashcard_correct_repetitions) — e.g. in a Study options/settings area or in app Settings; default 2.
- [x] **Session logic:** Build deck from **first 20 active words** (or fewer); apply correct-word repetitions; in-session “need practice” queue; persist times_shown and times_correct (and attempts_until_first_correct). No archive from flashcard UI.
- [x] **Empty/edge states:** No words, all archived, end session.
- [x] **TTS on card:** Reuse existing TTS: “Play” button on card calls `POST /api/openai/tts` with the Hebrew word; same pattern as translation table (TranslationDialog.vue `play-word-tts` → index.vue `playWordTts`). See §4.5.
- [ ] **Optional:** English → Hebrew direction; “Archived” filter and Restore; flashcard_session_cap_default, word_list_page_size, notes_list_page_size in user_settings.
- [x] **Admin – Study experiences:** “Study / Flashcards” section in Admin. **Aggregate** over all progress (words shown at least once; include archived). **Show notice** that figures include archived words. **All-time only** in v1. GET admin/study/stats, GET admin/study/users/:userId. User selector; per-user table. Admin-only auth.

---

## 10. Admin: Review User Study Experiences

Administrators need visibility into how the flashcard (study) feature is used across the product: aggregate metrics and the ability to drill down to individual users for support, product insight, and quality assurance. This section defines a new **Study / Flashcards** area within the existing Admin panel.

### 10.1 Access and Placement

- **Access:** Same as existing Admin: only users with role **admin** (or optionally **team**, if product decides) can access the Admin panel. The new section is visible only when the user has that role.
- **Placement:** Add a new collapsible section in the Admin page (alongside “User Management,” “Support Tickets,” “Pronunciation Cache,” etc.) titled **“Study / Flashcards”** or **“User Study Experiences.”**
- **No PII beyond existing admin:** Admin already has access to user list and support tickets; study stats are tied to user identity in the same way (e.g. user id, email/name as shown elsewhere in admin).

### 10.2 Aggregate Statistics

**Purpose:** Give a single-screen overview of flashcard usage across all users.

**Data source:** `word_list_progress` — aggregate over **all words that have been shown at least once** (include all progress rows, including those for words that are now archived). **Notify the user:** Display a notice to the admin that "These figures include progress for words that have been shown at least once, including words that are now archived."

**Suggested aggregate metrics:**

| Metric | Description |
|--------|-------------|
| **Total words studied** | Count of distinct (user_id, word_list_id) in `word_list_progress` (or count of rows). |
| **Total card shows** | Sum of `times_shown` across all progress rows. |
| **Total correct responses** | Sum of `times_correct` across all progress rows. |
| **Unique users who have studied** | Count of distinct `user_id` in `word_list_progress`. |
| **Average shows per word** | Total card shows ÷ total words studied (or similar). |
| **Average correct per word** | Total correct ÷ total words studied. |
| **First-time correct rate (optional)** | Among progress rows with `attempts_until_first_correct` set, share where `attempts_until_first_correct == 1` (got it right on first show). |

**UI (wireframe-level):** A summary card or table at the top of the Study admin section showing these numbers. **v1: Use all-time only** — no time range filter.

### 10.3 Per-User Statistics

**Purpose:** Allow an admin to select a user and see that user’s study experience in detail (e.g. for support or to understand engagement).

**Data source:** Same tables, filtered by `user_id`. Join to `user_word_list` (and parse `word_data`) to show which words the user has studied and their progress per word.

**Suggested per-user metrics (summary):**

| Metric | Description |
|--------|-------------|
| **Words in list (active)** | Count of `user_word_list` rows for this user with `archived_at IS NULL`. |
| **Words ever studied** | Count of `word_list_progress` rows for this user. |
| **Total card shows** | Sum of `times_shown` for this user. |
| **Total correct** | Sum of `times_correct` for this user. |
| **Average attempts until first correct** | Among this user’s progress rows with `attempts_until_first_correct` set, average of that column. |

**Per-word detail (optional but recommended):** A list or table of this user’s studied words (from `word_list_progress` joined to `user_word_list`), with columns such as:

- Hebrew word (from `word_data.wordEntry.word`)
- Translation (from `word_data.wordEntry.wordTranslation`)
- Times shown
- Times correct
- Attempts until first correct (if set)
- Last updated (`updated_at`)

**UI (wireframe-level):**

- Reuse the existing **user selector** (search + dropdown) from User Management, or add a dedicated “Select user for study stats” dropdown in the Study section.
- When a user is selected, show the per-user summary metrics and, below, a table of their studied words with the columns above. Pagination or “Load more” if the list is long.

### 10.4 APIs (Design Only)

- **GET /api/admin/study/stats**  
  **Auth:** `requireUserRole(event, ['admin'])` (or include `'team'` if desired).  
  **Response:** Aggregate metrics (total words studied, total shows, total correct, unique users, averages, optional first-time-correct rate). **v1: All-time only** — no time range query params.

- **GET /api/admin/study/users/:userId** (or **GET /api/admin/study/stats?userId=...**)  
  **Auth:** Same as above.  
  **Response:** Per-user summary (words in list, words studied, total shows, total correct, average attempts until first correct) plus a list of this user’s progress rows with word detail (word_list_id, Hebrew word, translation, times_shown, times_correct, attempts_until_first_correct, updated_at). Pagination if needed (e.g. `limit` / `offset`).

**Implementation note:** Queries join `word_list_progress` with `user_word_list` (and optionally `users`) as needed. No new tables required beyond those already in the design (word_list_progress, user_word_list, users).

### 10.5 Summary

| Item | Description |
|------|-------------|
| **Location** | New “Study / Flashcards” (or “User Study Experiences”) section in the existing Admin page. |
| **Aggregate** | One view: total words studied, total shows, total correct, unique users, averages; optional first-time-correct rate and time range. |
| **Per user** | Select user (reuse or mirror admin user selector); show summary stats and a table of studied words with times shown, times correct, attempts until first correct, last updated. |
| **APIs** | GET admin/study/stats (aggregate); GET admin/study/users/:userId or query param for per-user. Both admin-only. |

---

**End of Design Document**
