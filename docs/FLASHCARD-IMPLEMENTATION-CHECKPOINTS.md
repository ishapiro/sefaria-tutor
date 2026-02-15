# Flashcard Feature — Implementation Checkpoints

Use these checkpoints to test incrementally and commit to git after each working step.

---

## Before You Start

Run the new migration (required for Checkpoint 1+):

```bash
npx wrangler d1 execute sefaria-tutor-db --local --file=migrations/0015_flashcard_archive_progress_settings.sql
```

For production/remote D1, run the same file with `--remote` when ready.

---

## Checkpoint 1: Schema + Archive (no Study UI yet)

**Scope:** Archive instead of delete; My Word List shows only active words; PATCH to archive.

**What was implemented:**
- Migration `0015_flashcard_archive_progress_settings.sql`: `archived_at` on `user_word_list`, tables `word_list_progress`, `user_settings`.
- GET `/api/word-list`: default only active (`archived_at IS NULL`); `?archived=1` for archived-only.
- PATCH `/api/word-list/[id]`: body `{ "archived": true }` or `{ "archived": false }` to restore.
- My Word List modal: "Delete" → "Archive" (button label and confirmation).
- index.vue: `archiveWord()` calls PATCH with `{ archived: true }`; confirmation dialog text updated.

**How to test:**
1. Run migration 0015 (see above).
2. Log in, add a word to My Word List, open My Word List.
3. Click **Archive** on a word; confirm dialog says "Archive word?" / "Archive this word? It will be removed from your list and study deck. You can restore it later from Archived."
4. Confirm → word disappears from the list (archived).
5. (Optional) Call `GET /api/word-list?archived=1` to see archived words (UI for "Archived" view not in this checkpoint).

**Git:** Commit after Checkpoint 1 passes. Suggested message: `feat(flashcard): checkpoint 1 - archive word list, schema and PATCH API`

---

## Checkpoint 2: User settings API

**Scope:** GET/PATCH `/api/user/settings`; support `flashcard_correct_repetitions` (default 2).

**How to test:**
1. GET `/api/user/settings` → returns `{}` or existing keys.
2. PATCH with `{ "flashcard_correct_repetitions": "3" }` → then GET → value is 3 (or "3" stored).
3. Use default 2 when key missing.

**Git:** Commit after Checkpoint 2. Message: `feat(flashcard): checkpoint 2 - user settings API`

---

## Checkpoint 3: Progress API

**Scope:** Include progress (times_shown, times_correct, attempts_until_first_correct) in GET word-list response or separate endpoint; endpoint to record "shown" and "Know it".

**How to test:**
1. Record a "show" for a word (POST/PATCH progress) → then GET word-list (or progress) → times_shown incremented.
2. Record "Know it" → times_correct incremented; attempts_until_first_correct set on first correct.

**Git:** Commit after Checkpoint 3. Message: `feat(flashcard): checkpoint 3 - progress tracking API`

---

## Checkpoint 4: Study button + Study session UI

**Scope:** "Study" button in My Word List modal (disabled when 0 active words). Study session: deck = first 20 active words; cards Hebrew → English; "Show translation", "Know it" / "Need practice", "End session"; session summary at end. No archive on card. Persist progress on show and on "Know it".

**How to test:**
1. Open My Word List with at least one word → "Study" button enabled; click it.
2. See first card (Hebrew word); click "Show translation" → see translation/feedback.
3. Click "Know it" or "Need practice" → next card. Repeat; "End session" shows summary (e.g. words reviewed, shown/correct).
4. With 0 words, "Study" disabled.

**Git:** Commit after Checkpoint 4. Message: `feat(flashcard): checkpoint 4 - study session UI and flow`

---

## Checkpoint 5: Correct-word repetitions + TTS

**Scope:** Use setting `flashcard_correct_repetitions` (e.g. 2): after "Know it", show word that many times again before retiring. "Play" (TTS) button on card using existing `/api/openai/tts` and `playWordTts` pattern.

**How to test:**
1. Set "Repeat correct words" to 2; mark a word "Know it" → it appears 2 more times in the session, then retires.
2. On card, click Play → hear Hebrew pronunciation.

**Git:** Commit after Checkpoint 5. Message: `feat(flashcard): checkpoint 5 - correct-word repetitions and TTS`

---

## Checkpoint 6: Admin Study / Flashcards

**Scope:** Admin section "Study / Flashcards": aggregate stats (all progress, including archived); notice that figures include archived words; all-time only. Per-user: select user, summary + table of studied words. GET `/api/admin/study/stats`, GET `/api/admin/study/users/:userId`.

**How to test:**
1. Log in as admin, open Admin, expand "Study / Flashcards".
2. See aggregate metrics; see notice about archived words.
3. Select a user → see per-user summary and table of studied words.

**Git:** Commit after Checkpoint 6. Message: `feat(flashcard): checkpoint 6 - admin study stats`

---

## Summary

| Checkpoint | Main deliverable        | Test focus                          |
|------------|-------------------------|-------------------------------------|
| 1          | Archive + schema        | Archive word, list excludes archived |
| 2          | User settings API        | GET/PATCH settings                   |
| 3          | Progress API            | Record show/correct, read progress  |
| 4          | Study session UI        | Study flow, 20 words, summary       |
| 5          | Repetitions + TTS       | Correct-word repeats, Play sound    |
| 6          | Admin study stats       | Aggregate + per-user                |

After each checkpoint: run tests above, then `git add` and `git commit` before continuing.
