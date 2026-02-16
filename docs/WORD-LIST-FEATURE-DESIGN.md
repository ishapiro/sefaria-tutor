# Word List Feature — Design Document

## Overview

This document describes the design for the **Word List** feature, which allows logged-in users to save words from the word-by-word translation popup and manage their personal collection of saved words.

---

## 1. User Interface Design

### 1.1 Translation Dialog — "Add to Word List" Button

**Location:** Inside each individual word entry card in the word-by-word translation table

**Placement:** 
- Positioned on the right side of each word card, aligned with the word/translation row
- Only visible when `loggedIn === true` and `user.role === 'general'` (or higher)
- Each word entry has its own "Add to Word List" button

**Visual Design:**
```
┌─────────────────────────────────────────────────────────────┐
│ Word-by-word translation                              [Close]│
├─────────────────────────────────────────────────────────────┤
│                                                              │
│  [📋 Copy Hebrew]  [📋 Copy English]                        │
│                                                              │
│  ┌──────────────────────────────────────────────────────┐   │
│  │  בְּרֵאשִׁית בָּרָא אֱלֹהִים                        │   │
│  │  In the beginning God created                        │   │
│  └──────────────────────────────────────────────────────┘   │
│                                                              │
│  Word Analysis                                               │
│  ┌──────────────────────────────────────────────────────┐   │
│  │ בְּרֵאשִׁית  Beginning  Root: ר-א-ש    [⭐ Add]      │   │
│  │ Noun, Feminine                                        │   │
│  └──────────────────────────────────────────────────────┘   │
│                                                              │
│  ┌──────────────────────────────────────────────────────┐   │
│  │ בָּרָא  Created  Root: ב-ר-א          [⭐ Add]        │   │
│  │ Verb, Qal, Past                                       │   │
│  └──────────────────────────────────────────────────────┘   │
│  ...                                                         │
└─────────────────────────────────────────────────────────────┘
```

**Button Design:**
- **Size:** Small button, compact to fit in word card
- **Icon:** Star icon (⭐) or bookmark icon (🔖)
- **Text:** "Add" (short label) or just icon
- **Position:** Right-aligned in the first row, after root/metadata
- **Style:** Small padding (`px-2 py-1`), subtle styling to not overwhelm the word card

**Button States:**
- **Default:** Small blue/gray button with star icon (⭐) and text "Add"
- **Hover:** Slightly darker background
- **Success (after adding):** Green background with checkmark (✅) and text "Added"
- **Loading:** Disabled state with spinner (small spinner)
- **Error:** Red background with error icon
- **Already Added:** Grayed out with checkmark (✅) and text "In List"

**Behavior:**
- Clicking the button saves **only that specific word row** (the individual `wordTable` entry) to the user's word list
- The saved data includes:
  - The specific word entry (`wordEntry`) with all its columns/fields from that row
  - Context: `originalPhrase` and `translatedPhrase` from the full translation
  - All columns/fields from that specific wordTable row are preserved (word, wordTranslation, wordRoot, partOfSpeech, gender, tense, binyan, grammarNotes, etc.)
- Only the clicked word row is saved, not the entire wordTable array
- Shows success feedback for 2-3 seconds, then updates to "In List" state
- If that specific word already exists in user's list, button shows "In List" state (disabled/grayed)
- Each word entry's button state is independent (one word can be added while others remain addable)

---

### 1.2 Top Navigation — "My Word List" Button

**Location:** Top of the index page, in the button row alongside "Refresh Index", "Help", and "Admin" (if admin)

**Placement:**
```
┌─────────────────────────────────────────────────────────────┐
│ Word Explorer (Using OpenAI Model: gpt-4o)                  │
│                                                              │
│  [🔍 Search books...]  [Refresh Index]  [Help]  [My Word List]│
│                                                              │
│  (Book list below...)                                        │
└─────────────────────────────────────────────────────────────┘
```

**Visual Design:**
- Standard button matching existing button style: `px-4 py-2 border border-gray-300 rounded-lg hover:bg-gray-100`
- Icon: 📚 (book icon) or 📝 (notebook icon)
- Text: "My Word List"
- Only visible when `loggedIn === true`

**Button States:**
- **Default:** Gray border, white background
- **Hover:** Light gray background
- **Active (when modal is open):** Blue border, light blue background

---

### 1.3 Word List Modal/View

**Trigger:** Clicking "My Word List" button opens a modal dialog

**Layout:**
```
┌─────────────────────────────────────────────────────────────┐
│ My Word List                                          [×]    │
├─────────────────────────────────────────────────────────────┤
│                                                              │
│  Total words: 15                                             │
│                                                              │
│  ┌──────────────────────────────────────────────────────┐   │
│  │ Genesis 1:1                                          │   │
│  │ בְּרֵאשִׁית בָּרָא אֱלֹהִים                        │   │
│  │ In the beginning God created                         │   │
│  │                                                       │   │
│  │ בְּרֵאשִׁית                                          │   │
│  │ Beginning                                             │   │
│  │ Root: ר-א-ש | Noun, Feminine                         │   │
│  │ Saved: Jan 15, 2025                                  │   │
│  │                                    [🗑️ Delete]        │   │
│  └──────────────────────────────────────────────────────┘   │
│                                                              │
│  ┌──────────────────────────────────────────────────────┐   │
│  │ Berakhot 2a                                          │   │
│  │ מֵאֵימָתַי קוֹרִין אֶת שְׁמַע                        │   │
│  │ From when do we recite the Shema                    │   │
│  │                                                       │   │
│  │ בָּרָא                                               │   │
│  │ Created                                               │   │
│  │ Root: ב-ר-א | Verb, Qal, Past                        │   │
│  │ Saved: Jan 14, 2025                                   │   │
│  │                                    [🗑️ Delete]        │   │
│  └──────────────────────────────────────────────────────┘   │
│                                                              │
│  ... (more words)                                           │
│                                                              │
│  [Close]                                                     │
└─────────────────────────────────────────────────────────────┘
```

**Features:**
- **Header:** "My Word List" title with close button (×)
- **Word Count:** Shows total number of saved words at the top (or filtered count when searching)
- **Word Cards:** Each saved word displayed in a card showing:
  - **Source text reference** (blue, at top) - from `sourceText` or `bookTitle` (e.g., "Genesis 1:1", "Berakhot 2a")
  - Context phrase (smaller text) - from `originalPhrase` / `translatedPhrase`
  - Hebrew word (large, RTL) - from `wordEntry.word`
  - English translation - from `wordEntry.wordTranslation`
  - Root (if available) - from `wordEntry.wordRoot`
  - Part of speech, gender, tense, binyan (if available) - from `wordEntry`
  - All other fields from `wordEntry` (hebrewAramaic, grammarNotes, etc.)
  - Date saved
  - Delete button (🗑️) on the right
- **Empty State:** If no words saved, show: "You haven't saved any words yet. Use the 'Add to Word List' button in the translation dialog to start building your collection."
- **Delete Confirmation:** When clicking delete, show a small confirmation dialog: "Remove this word from your list?" with [Cancel] and [Delete] buttons
- **Scrollable:** If many words, make the list scrollable with max height

**Word Card Design:**
- White background with subtle border
- Hover effect: slight shadow/border color change
- **Source text reference:** Blue (text-xs), font-medium, at top of card
- Hebrew text: Large (text-2xl), RTL, blue color
- English translation: Medium (text-xl), gray-900
- Metadata: Small text (text-sm), gray-600
- Delete button: Red on hover, gray by default

---

## 2. Database Schema

### 2.1 New Table: `user_word_list`

```sql
CREATE TABLE IF NOT EXISTS user_word_list (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    user_id TEXT NOT NULL,
    word_data TEXT NOT NULL,  -- JSON string containing full translationData
    created_at INTEGER NOT NULL,  -- Unix timestamp
    FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
);

-- Index for faster lookups by user_id
CREATE INDEX IF NOT EXISTS idx_user_word_list_user_id ON user_word_list(user_id);

-- Index for sorting by creation date
CREATE INDEX IF NOT EXISTS idx_user_word_list_created_at ON user_word_list(created_at DESC);
```

**Fields:**
- `id`: Primary key (auto-increment)
- `user_id`: Foreign key to `users.id` (from auth schema)
- `word_data`: JSON string containing the word entry and context (see Data Structure section)
- `created_at`: Unix timestamp when word was saved

**Notes:**
- `word_data` stores a single word entry (`wordEntry`) along with phrase context:
  - `originalPhrase` and `translatedPhrase` (for context/reference)
  - `wordEntry` object containing all columns/fields from the specific wordTable row that was clicked
- Each row represents one saved word (the specific word entry that was clicked)
- The user clicks "Add" on a specific word row, and we save only that row (not the entire wordTable array)
- All columns/fields from that specific wordTable row are preserved in `wordEntry`
- Foreign key constraint ensures words are deleted if user account is deleted
- Indexes optimize queries for fetching a user's word list

---

## 3. API Endpoints

### 3.1 POST `/api/word-list/add`

**Purpose:** Add a word to the user's word list

**Authentication:** Required (must be logged in as 'general' role or higher)

**Request Body:**
```typescript
{
  wordData: {
    originalPhrase?: string        // Full Hebrew phrase (for context)
    translatedPhrase?: string      // Full English translation (for context)
    wordEntry: {                    // The specific word row that was clicked (all columns from that row)
      word?: string
      wordTranslation?: string
      hebrewAramaic?: string
      wordRoot?: string
      wordPartOfSpeech?: string
      wordGender?: string | null
      wordTense?: string | null
      wordBinyan?: string | null
      presentTenseHebrew?: string | null
      grammarNotes?: string
      // ... all other columns/fields from that specific wordTable row
    }
  }
}
```

**Response:**
```typescript
{
  success: true
  message: "Word added to your list"
  wordId: number  // ID of the newly created entry
}
```

**Error Responses:**
- `401`: Not logged in
- `403`: User not verified or insufficient role
- `400`: Invalid word data (missing word entry)
- `409`: Word already exists (optional - could allow duplicates)

**Implementation Notes:**
- Store only the specific word row that was clicked (the `wordEntry` object)
- Include `originalPhrase` and `translatedPhrase` for context/reference
- Include source text information:
  - `sourceText`: Formatted reference (e.g., "Genesis 1:1", "Berakhot 2a") - displayed prominently
  - `bookTitle`: Book name for search and reference
  - `sefariaRef`: Raw Sefaria API reference for technical use
- Store all columns/fields from that specific wordTable row (preserves all word analysis data)
- The user clicked "Add" on a specific word entry, so we save only that word entry (not the entire wordTable array)
- Check if word already exists (optional - could allow duplicates for same word in different contexts/phrases)
- Store entire `wordData` object as JSON string in `word_data` column

---

### 3.2 GET `/api/word-list`

**Purpose:** Get all words in the user's word list (with optional search)

**Authentication:** Required (must be logged in)

**Query Parameters:**
- `search` (optional): Search query string to filter words
  - **Note:** For initial implementation, search will be client-side only. This parameter is reserved for future server-side filtering if needed.

**Response:**
```typescript
{
  words: Array<{
    id: number
    wordData: {
      originalPhrase?: string      // Context phrase
      translatedPhrase?: string    // Context translation
      sourceText?: string          // Formatted source reference (e.g., "Genesis 1:1")
      bookTitle?: string          // Book name
      sefariaRef?: string         // Raw Sefaria reference
      wordEntry: {                  // The saved word row (all columns from that row)
        word?: string
        wordTranslation?: string
        hebrewAramaic?: string
        wordRoot?: string
        wordPartOfSpeech?: string
        wordGender?: string | null
        wordTense?: string | null
        wordBinyan?: string | null
        presentTenseHebrew?: string | null
        grammarNotes?: string
        // ... all other columns/fields from that specific wordTable row
      }
    }
    createdAt: number  // Unix timestamp
  }>
  total: number  // Total count (after filtering)
}
```

**Error Responses:**
- `401`: Not logged in
- `403`: User not verified

**Implementation Notes:**
- Return words ordered by `created_at DESC` (newest first)
- Parse `word_data` JSON string back to object
- Include word count in response
- **Initial Implementation:** Return all words for the user (client-side filtering handles search)
- **Future Enhancement:** If `search` parameter provided, filter words using JSON functions with LIKE queries (see section 10.2 for SQL examples)

---

### 3.3 DELETE `/api/word-list/[id]`

**Purpose:** Delete a word from the user's word list

**Authentication:** Required (must be logged in)

**URL Parameter:** `id` - the word list entry ID

**Response:**
```typescript
{
  success: true
  message: "Word removed from your list"
}
```

**Error Responses:**
- `401`: Not logged in
- `403`: User not verified or word doesn't belong to user
- `404`: Word not found

**Implementation Notes:**
- Verify that the word belongs to the requesting user (security check)
- Use the word's `id` from the database, not a hash or other identifier

---

## 4. Data Structure

### 4.1 Word Data Format

The `wordData` stored in the database matches the `translationData` structure from the translation dialog:

```typescript
{
  originalPhrase?: string        // Full Hebrew phrase (for context)
  translatedPhrase?: string      // Full English translation (for context)
  sourceText?: string            // Formatted source reference (e.g., "Genesis 1:1", "Berakhot 2a")
  bookTitle?: string            // Book name (e.g., "Genesis", "Berakhot")
  sefariaRef?: string           // Raw Sefaria API reference (e.g., "Genesis_1.1")
  wordEntry: {                   // The specific word row that was clicked (all columns from that row)
    word?: string               // Hebrew word
    wordTranslation?: string    // English translation
    hebrewAramaic?: string      // "Hebrew" or "Aramaic"
    wordRoot?: string           // Root letters (e.g., "ר-א-ש")
    wordPartOfSpeech?: string   // "Noun", "Verb", etc.
    wordGender?: string | null  // "Masculine", "Feminine", null
    wordTense?: string | null   // "Past", "Present", "Future", null
    wordBinyan?: string | null // "Qal", "Piel", etc., null
    presentTenseHebrew?: string | null
    grammarNotes?: string      // Additional grammar notes
    rootExamples?: Array<{ word: string; translation: string }>  // Additional words sharing the same root
    // ... all other columns/fields from that specific wordTable row
  }
}
```

**Storage:** This entire object is serialized to JSON and stored in the `word_data` TEXT column.

**Note:** The structure stores only the specific word row (`wordEntry`) that the user clicked, along with the phrase context (`originalPhrase`, `translatedPhrase`) and source text information (`sourceText`, `bookTitle`, `sefariaRef`). All columns/fields from that specific wordTable row are preserved, but we do not store the entire wordTable array - only the one row that was selected.

**Source Text Reference:**
- `sourceText`: Human-readable formatted reference (e.g., "Genesis 1:1", "Berakhot 2a") - displayed prominently in the word list
- `bookTitle`: Book name extracted from the current book selection
- `sefariaRef`: Raw Sefaria API reference format for technical use or future features
- The `sourceText` is built using the existing `buildSefariaRefForSection` function to ensure consistent formatting

---

## 5. User Flow

### 5.1 Adding a Word

1. User selects text and opens word-by-word translation dialog
2. If logged in, each word entry in the word table shows an "Add" button
3. User clicks "Add" button on a specific word entry (one row from `wordTable`)
4. Button shows loading state (spinner)
5. API call to `POST /api/word-list/add` with that specific word's data:
   - The specific word row (`wordEntry`) from `wordTable` with all its columns/fields
   - Context: `originalPhrase` and `translatedPhrase` from the full translation
   - Source text: `sourceText` (formatted reference), `bookTitle`, and `sefariaRef` from current book selection
   - Only the clicked row is saved, not the entire wordTable array
6. On success:
   - Button changes to green "Added" with checkmark
   - After 2-3 seconds, button changes to "In List" state (grayed out, disabled)
7. On error:
   - Show error message (e.g., "Failed to add word. Please try again.")
   - Button returns to default "Add" state
8. If word already exists:
   - Button shows "In List" state immediately (no API call needed, or API returns 409)

### 5.2 Viewing Word List

1. User clicks "My Word List" button in top navigation
2. Modal opens showing all saved words
3. Words displayed in cards, newest first
4. Each card shows Hebrew word, translation, metadata (root, part of speech, etc.), and when available, **"Additional examples with the same root"** — other words sharing the same root with their translations (e.g., ילדה — girl, אוכל — food)

### 5.3 Deleting a Word

1. User clicks delete button (🗑️) on a word card
2. Confirmation dialog appears: "Remove this word from your list?"
3. User clicks "Delete" (or "Cancel")
4. If confirmed:
   - API call to `DELETE /api/word-list/[id]`
   - On success: Remove word card from UI immediately
   - On error: Show error message, keep word in list

---

## 6. Visual Styling Details

### 6.1 Color Scheme

- **Primary buttons:** Blue (`bg-blue-600`, `hover:bg-blue-700`)
- **Success state:** Green (`bg-green-600`)
- **Delete button:** Red on hover (`hover:text-red-600`, `hover:bg-red-50`)
- **Word cards:** White background with gray border (`border-gray-200`)
- **Source text reference:** Blue (`text-blue-600`, `font-medium`)
- **Hebrew text:** Blue (`text-blue-700`)
- **Metadata:** Gray (`text-gray-600`)

### 6.2 Typography

- **Dialog title:** `text-2xl font-bold`
- **Source text reference:** `text-xs font-medium text-blue-600`
- **Hebrew word:** `text-2xl font-bold` (RTL)
- **English translation:** `text-xl font-semibold`
- **Metadata:** `text-sm text-gray-600`
- **Word count:** `text-base text-gray-700`

### 6.3 Spacing & Layout

- **Button row:** `flex flex-wrap items-center gap-3`
- **Word cards:** `space-y-3` between cards
- **Card padding:** `p-4`
- **Modal padding:** `p-6`
- **Modal max width:** `max-w-3xl` or `w-[90vw]`
- **Modal max height:** `max-h-[90vh]` with `overflow-y-auto`

---

## 7. Edge Cases & Considerations

### 7.1 Duplicate Words

**Decision:** Allow duplicates. A user might want to save the same word from different contexts (different phrases, different grammatical forms).

**Alternative:** If we want to prevent duplicates, check if `originalPhrase` + first word in `wordTable` already exists for the user.

### 7.2 Large Word Lists

- Implement pagination if list grows very large (e.g., 50+ words)
- For now, load all words at once (acceptable for initial feature)

### 7.3 Word Data Changes

- Store the exact `translationData` at the time of saving
- Source text information is captured from the current book selection when the word is added
- If translation API changes format, old saved words still display correctly
- If source text information is missing (e.g., word saved before feature was added), fallback to showing book title or omitting source reference
- No need to migrate old data

### 7.4 Performance

- Index on `user_id` ensures fast lookups
- Index on `created_at` ensures fast sorting
- JSON parsing is lightweight for typical word data size

---

## 8. Migration File

Create a new migration: `migrations/0008_user_word_list.sql`

```sql
-- User word list table
CREATE TABLE IF NOT EXISTS user_word_list (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    user_id TEXT NOT NULL,
    word_data TEXT NOT NULL,
    created_at INTEGER NOT NULL,
    FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
);

-- Indexes for performance
CREATE INDEX IF NOT EXISTS idx_user_word_list_user_id ON user_word_list(user_id);
CREATE INDEX IF NOT EXISTS idx_user_word_list_created_at ON user_word_list(created_at DESC);
```

---

## 9. Implementation Checklist

- [ ] Create database migration (`0008_user_word_list.sql`)
- [ ] Implement `POST /api/word-list/add` endpoint
- [ ] Implement `GET /api/word-list` endpoint
- [ ] Implement `DELETE /api/word-list/[id]` endpoint
- [ ] Add "Add to Word List" button to each word entry in translation dialog (conditional on `loggedIn`)
- [ ] Implement button state management (default, loading, success, "In List")
- [ ] Track which words are already in user's list to show "In List" state
- [ ] Capture and store source text information (book title, section reference)
- [ ] Display source text reference in word list cards
- [ ] Add "My Word List" button to top navigation (conditional on `loggedIn`)
- [ ] Create Word List modal component/view
- [ ] Implement word card display with delete functionality
- [ ] Add loading and error states
- [ ] Add success feedback when adding words
- [ ] Add delete confirmation dialog
- [ ] Implement client-side search filtering (see section 10.4)
- [ ] Add search input to Word List modal (see section 10.5)
- [ ] Add filter function to match search term across all word fields (including source text fields) (including source text)
- [ ] Add debouncing to search input (~200-300ms)
- [ ] Update word count display to show filtered count when searching
- [ ] Add "No words found" empty state when search returns no results
- [ ] Capture source text information when adding words (book title, section reference)
- [ ] Display source text reference in word list cards
- [ ] Include source text fields in search filtering
- [ ] Test with multiple users
- [ ] Test edge cases (empty list, duplicate words, search edge cases, etc.)

---

## 10. Search Implementation

### 10.0 Summary

**Chosen Implementation:** Client-side filtering using JavaScript/Vue (Phase 1)

- **Search Method:** Filter words in JavaScript after loading all user's words
- **Database Support:** Cloudflare D1 JSON functions available for future server-side filtering if needed
- **User Experience:** Real-time, instant filtering as user types
- **Performance:** Optimal for typical word lists (10-100 words per user)
- **Future Option:** Can migrate to server-side filtering using JSON functions with LIKE queries if lists grow large

**Key Decision:** Start with client-side filtering for simplicity and instant feedback. Server-side filtering using D1's JSON functions is documented and ready for implementation if needed.

---

### 10.1 Overview

**Chosen Approach:** JSON Functions with LIKE queries using Cloudflare D1's native SQLite JSON support.

This approach uses SQLite's `json_extract()` function to search within the JSON `word_data` column stored in the `user_word_list` table. It's simple, requires no schema changes, and performs well for typical word list sizes (10-100 words per user).

**Alternative Considered:** FTS5 virtual table (documented in section 10.3 for future reference, but not part of initial implementation).

### 10.2 Implementation: JSON Functions with LIKE

**Rationale:**
- Simple implementation — works with existing schema (no migrations needed)
- Cloudflare D1 natively supports SQLite JSON functions
- Good performance for typical use cases (10-100 words per user)
- No additional tables or triggers required
- Case-insensitive search using `LOWER()` function

**How It Works:**

Use SQLite's `json_extract()` function to extract searchable fields from the JSON `word_data` column, then use `LIKE` with wildcards for pattern matching. Cloudflare D1 supports all standard SQLite JSON functions including `json_extract()`, `json_each()`, and `LOWER()`.

**Search Fields:**
- Source text reference (`sourceText` - formatted reference like "Genesis 1:1")
- Book title (`bookTitle` - e.g., "Genesis", "Berakhot")
- Sefaria reference (`sefariaRef` - raw API reference)
- Hebrew phrase (`originalPhrase` - context)
- English translation (`translatedPhrase` - context)
- Hebrew word (`wordEntry.word`)
- English translation (`wordEntry.wordTranslation`)
- Root (`wordEntry.wordRoot`)
- Part of speech (`wordEntry.wordPartOfSpeech`)
- Any other fields in `wordEntry` (wordGender, wordTense, wordBinyan, grammarNotes, etc.)

**SQL Query Example:**
```sql
SELECT id, user_id, word_data, created_at
FROM user_word_list
WHERE user_id = ?
  AND (
    LOWER(json_extract(word_data, '$.sourceText')) LIKE LOWER(?) OR
    LOWER(json_extract(word_data, '$.bookTitle')) LIKE LOWER(?) OR
    LOWER(json_extract(word_data, '$.sefariaRef')) LIKE LOWER(?) OR
    LOWER(json_extract(word_data, '$.originalPhrase')) LIKE LOWER(?) OR
    LOWER(json_extract(word_data, '$.translatedPhrase')) LIKE LOWER(?) OR
    LOWER(json_extract(word_data, '$.wordEntry.word')) LIKE LOWER(?) OR
    LOWER(json_extract(word_data, '$.wordEntry.wordTranslation')) LIKE LOWER(?) OR
    LOWER(json_extract(word_data, '$.wordEntry.wordRoot')) LIKE LOWER(?) OR
    LOWER(json_extract(word_data, '$.wordEntry.wordPartOfSpeech')) LIKE LOWER(?) OR
    LOWER(json_extract(word_data, '$.wordEntry.wordGender')) LIKE LOWER(?) OR
    LOWER(json_extract(word_data, '$.wordEntry.wordTense')) LIKE LOWER(?) OR
    LOWER(json_extract(word_data, '$.wordEntry.wordBinyan')) LIKE LOWER(?) OR
    LOWER(json_extract(word_data, '$.wordEntry.grammarNotes')) LIKE LOWER(?)
  )
ORDER BY created_at DESC
```

**Note:** Searches the specific `wordEntry` object (the saved word row), context fields, and source text fields. No need for `json_each()` since we're storing a single word entry, not an array.

**Search Pattern:**
- User types: "beginning"
- Convert to: `%beginning%` (wildcard search)
- Search in: English translation, Hebrew word, root
- Use `LOWER()` for case-insensitive matching

**Limitations:**
- No ranking/relevance scoring (all matches treated equally)
- Slower for very large datasets (1000+ words per user)
- Doesn't handle Hebrew/Aramaic text search optimally (no stemming)
- Hebrew text search works but may not match all variations

**Performance Considerations:**
- For typical user word lists (10-100 words), performance is acceptable
- JSON extraction is fast in SQLite/D1
- Index on `user_id` ensures we only search user's own words
- Consider client-side filtering for small lists (< 50 words) to reduce API calls

### 10.3 Alternative Approach: FTS5 Virtual Table (Future Consideration)

**Note:** This approach is documented for future reference but is **not part of the initial implementation**. Consider this if users accumulate 500+ words and need advanced search features.

**Why:** More powerful search with ranking, better performance at scale.

**Schema Addition:**
```sql
-- FTS5 virtual table for full-text search
CREATE VIRTUAL TABLE IF NOT EXISTS user_word_list_fts USING fts5(
    id UNINDEXED,  -- Link back to main table
    user_id UNINDEXED,
    hebrew_text,      -- Extracted Hebrew words
    english_text,     -- Extracted English translations
    root_text,        -- Extracted roots
    content='user_word_list',  -- Source table
    content_rowid='id'        -- Link column
);

-- Trigger to keep FTS5 table in sync
CREATE TRIGGER IF NOT EXISTS user_word_list_fts_insert AFTER INSERT ON user_word_list BEGIN
  INSERT INTO user_word_list_fts(rowid, id, user_id, hebrew_text, english_text, root_text)
  VALUES (
    new.id,
    new.id,
    new.user_id,
    json_extract(new.word_data, '$.originalPhrase') || ' ' || 
      (SELECT GROUP_CONCAT(json_extract(value, '$.word'), ' ')
       FROM json_each(json_extract(new.word_data, '$.wordTable'))),
    json_extract(new.word_data, '$.translatedPhrase') || ' ' ||
      (SELECT GROUP_CONCAT(json_extract(value, '$.wordTranslation'), ' ')
       FROM json_each(json_extract(new.word_data, '$.wordTable'))),
    (SELECT GROUP_CONCAT(json_extract(value, '$.wordRoot'), ' ')
     FROM json_each(json_extract(new.word_data, '$.wordTable'))
     WHERE json_extract(value, '$.wordRoot') IS NOT NULL)
  );
END;

-- Similar triggers for UPDATE and DELETE
```

**Search Query:**
```sql
SELECT wl.id, wl.user_id, wl.word_data, wl.created_at
FROM user_word_list wl
JOIN user_word_list_fts fts ON wl.id = fts.id
WHERE fts.user_id = ?
  AND user_word_list_fts MATCH ?
ORDER BY bm25(user_word_list_fts) ASC, wl.created_at DESC
```

**Benefits:**
- Relevance ranking using `bm25()` function
- Phrase matching, prefix matching, boolean operators
- Better performance for large datasets
- Can search across multiple fields simultaneously

**Drawbacks:**
- More complex setup (triggers, sync)
- Requires maintaining two tables
- More storage overhead

### 10.5 UI Design for Search

**Location:** Inside the Word List modal, at the top

**Layout:**
```
┌─────────────────────────────────────────────────────────────┐
│ My Word List                                          [×]    │
├─────────────────────────────────────────────────────────────┤
│                                                              │
│  🔍 [Search words...                    ]  Showing: 15      │
│                                                              │
│  ┌──────────────────────────────────────────────────────┐   │
│  │ בְּרֵאשִׁית                                          │   │
│  │ Beginning                                             │   │
│  │ Root: ר-א-ש | Noun, Feminine                         │   │
│  │                                    [🗑️ Delete]        │   │
│  └──────────────────────────────────────────────────────┘   │
│  ...                                                         │
└─────────────────────────────────────────────────────────────┘
```

**Search Input:**
- Placeholder: "Search words..."
- Icon: 🔍 (search icon) on the left
- Real-time filtering as user types (debounced, ~300ms)
- Clear button (×) appears when text is entered
- Shows "No words found" message when search returns no results

**Search Behavior:**
- Search across: Source text reference, book title, Hebrew word, English translation, root, part of speech
- Case-insensitive matching
- Partial matching (e.g., "begin" matches "beginning", "Genesis" matches "Genesis 1:1", "ר-א-ש" matches words with that root)
- Real-time filtering as user types (client-side, no API calls)
- Debounce filter function (~200-300ms) for performance
- Shows filtered word count: "Showing 5 of 15 words" when search is active
- Shows "No words found" message when search returns no results

**Implementation Strategy:**

**Phase 1: Client-Side Filtering (Initial Implementation)**
- Load all user's words when Word List modal opens
- Filter words in JavaScript/Vue as user types in search input
- Use Vue `computed` property with filter function
- **Pros:** Instant feedback, no API calls, simpler implementation
- **Cons:** Loads all data upfront (acceptable for typical lists < 100 words)
- **Debouncing:** Optional but recommended (~200-300ms) to improve performance

**Phase 2: Server-Side Filtering (Future Enhancement if Needed)**
- Add `search` query parameter to `GET /api/word-list` endpoint
- Filter in database using JSON functions with LIKE queries
- Debounce API calls (~300ms) to avoid excessive requests
- **When to implement:** If users accumulate 100+ words and client-side filtering becomes slow
- **SQL Implementation:** Use the query examples from section 10.2

**Chosen Approach:** Start with Phase 1 (client-side filtering). This provides the best user experience for typical use cases and can be enhanced to Phase 2 if needed.

### 10.4 Search Query Implementation Details

**Client-Side Filtering Logic:**

Filter words by checking if the search term matches any of these fields:
- `wordData.sourceText` (formatted source reference - e.g., "Genesis 1:1")
- `wordData.bookTitle` (book name - e.g., "Genesis", "Berakhot")
- `wordData.sefariaRef` (raw Sefaria reference)
- `wordData.originalPhrase` (Hebrew phrase - context)
- `wordData.translatedPhrase` (English translation - context)
- `wordData.wordEntry.word` (Hebrew word)
- `wordData.wordEntry.wordTranslation` (English translation)
- `wordData.wordEntry.wordRoot` (root letters)
- `wordData.wordEntry.wordPartOfSpeech` (part of speech)
- Any other fields in `wordEntry` (wordGender, wordTense, wordBinyan, grammarNotes, etc.)

**Example JavaScript/Vue Filter Function:**
```javascript
function matchesSearch(word, searchTerm) {
  const term = searchTerm.toLowerCase().trim()
  if (!term) return true
  
  const data = word.wordData
  const entry = data.wordEntry || {}
  
  // Check source text fields
  if (data.sourceText?.toLowerCase().includes(term)) return true
  if (data.bookTitle?.toLowerCase().includes(term)) return true
  if (data.sefariaRef?.toLowerCase().includes(term)) return true
  
  // Check phrase-level fields (context)
  if (data.originalPhrase?.toLowerCase().includes(term)) return true
  if (data.translatedPhrase?.toLowerCase().includes(term)) return true
  
  // Check the saved word entry fields
  if (entry.word?.toLowerCase().includes(term)) return true
  if (entry.wordTranslation?.toLowerCase().includes(term)) return true
  if (entry.wordRoot?.toLowerCase().includes(term)) return true
  if (entry.wordPartOfSpeech?.toLowerCase().includes(term)) return true
  if (entry.wordGender?.toLowerCase().includes(term)) return true
  if (entry.wordTense?.toLowerCase().includes(term)) return true
  if (entry.wordBinyan?.toLowerCase().includes(term)) return true
  if (entry.grammarNotes?.toLowerCase().includes(term)) return true
  // Check any other fields as needed
  
  return false
}
```

**Server-Side Filtering (For Future Phase 2):**

The `GET /api/word-list` endpoint will support an optional `search` query parameter. When provided, the database query will use JSON functions to filter results (see SQL examples in section 10.2).

---

## 11. Future Enhancements (Out of Scope)

- Export word list to CSV/PDF
- Group words by root or part of speech
- Study mode (flashcards, quiz)
- Share word lists with other users
- Tags/categories for words
- Notes field for each word

---

**End of Design Document**
