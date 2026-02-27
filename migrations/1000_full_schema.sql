-- 1000_full_schema.sql
-- Canonical full schema for new D1 databases.
-- This file consolidates the schema defined across earlier migrations
-- (0001–0017) into a single idempotent script that can be applied to an
-- empty database to bring it up to the current production shape.
--
-- Safe to run multiple times thanks to IF NOT EXISTS / INSERT OR IGNORE.

-------------------------------------------------------------------------------
-- Translation cache and stats
-------------------------------------------------------------------------------

CREATE TABLE IF NOT EXISTS translation_cache (
    phrase_hash TEXT PRIMARY KEY,
    phrase TEXT NOT NULL,
    response TEXT NOT NULL,
    created_at INTEGER NOT NULL,
    version INTEGER DEFAULT 1,
    prompt_hash TEXT
);

CREATE TABLE IF NOT EXISTS cache_stats (
    id INTEGER PRIMARY KEY,
    hits INTEGER DEFAULT 0,
    misses INTEGER DEFAULT 0,
    malformed_hits INTEGER DEFAULT 0,
    updated_at INTEGER NOT NULL
);

INSERT OR IGNORE INTO cache_stats (id, hits, misses, malformed_hits, updated_at)
VALUES (1, 0, 0, 0, strftime('%s', 'now'));

-------------------------------------------------------------------------------
-- Pronunciation cache
-------------------------------------------------------------------------------

CREATE TABLE IF NOT EXISTS pronunciation_cache (
    text_hash TEXT PRIMARY KEY,
    normalized_text TEXT NOT NULL,
    r2_key TEXT NOT NULL,
    file_size_bytes INTEGER NOT NULL,
    created_at INTEGER NOT NULL,
    last_accessed_at INTEGER NOT NULL,
    access_count INTEGER DEFAULT 0
);

CREATE INDEX IF NOT EXISTS idx_pronunciation_last_accessed
  ON pronunciation_cache(last_accessed_at);

CREATE INDEX IF NOT EXISTS idx_pronunciation_text
  ON pronunciation_cache(normalized_text);

CREATE TABLE IF NOT EXISTS pronunciation_cache_stats (
    id INTEGER PRIMARY KEY,
    total_size_bytes INTEGER DEFAULT 0,
    total_files INTEGER DEFAULT 0,
    hits INTEGER DEFAULT 0,
    misses INTEGER DEFAULT 0,
    last_purge_at INTEGER,
    updated_at INTEGER NOT NULL
);

INSERT OR IGNORE INTO pronunciation_cache_stats (
  id, total_size_bytes, total_files, hits, misses, updated_at
) VALUES (1, 0, 0, 0, 0, strftime('%s', 'now'));

-------------------------------------------------------------------------------
-- Auth: users and teams
-------------------------------------------------------------------------------

CREATE TABLE IF NOT EXISTS users (
  id TEXT PRIMARY KEY,
  email TEXT UNIQUE NOT NULL,
  name TEXT,
  role TEXT DEFAULT 'general',
  password_hash TEXT,
  is_verified BOOLEAN DEFAULT FALSE,
  verification_token TEXT,
  token_expires_at INTEGER,
  team_id TEXT,
  deleted_at INTEGER,
  password_reset_token TEXT,
  password_reset_expires_at INTEGER,
  created_at INTEGER DEFAULT (strftime('%s', 'now')),
  FOREIGN KEY (team_id) REFERENCES teams(id)
);

CREATE INDEX IF NOT EXISTS idx_users_password_reset_token
  ON users(password_reset_token);

CREATE TABLE IF NOT EXISTS teams (
  id TEXT PRIMARY KEY,
  name TEXT NOT NULL,
  leader_id TEXT NOT NULL,
  invite_code TEXT UNIQUE,
  created_at INTEGER DEFAULT (strftime('%s', 'now')),
  FOREIGN KEY (leader_id) REFERENCES users(id)
);

-------------------------------------------------------------------------------
-- User word list and flashcard-related tables
-------------------------------------------------------------------------------

CREATE TABLE IF NOT EXISTS user_word_list (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    user_id TEXT NOT NULL,
    word_data TEXT NOT NULL,
    created_at INTEGER NOT NULL,
    archived_at INTEGER NULL,
    FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
);

CREATE INDEX IF NOT EXISTS idx_user_word_list_user_id
  ON user_word_list(user_id);

CREATE INDEX IF NOT EXISTS idx_user_word_list_created_at
  ON user_word_list(created_at DESC);

CREATE INDEX IF NOT EXISTS idx_user_word_list_archived_at
  ON user_word_list(archived_at);

CREATE TABLE IF NOT EXISTS word_list_progress (
    user_id TEXT NOT NULL,
    word_list_id INTEGER NOT NULL,
    times_shown INTEGER NOT NULL DEFAULT 0,
    times_correct INTEGER NOT NULL DEFAULT 0,
    attempts_until_first_correct INTEGER NULL,
    updated_at INTEGER NOT NULL,
    PRIMARY KEY (user_id, word_list_id),
    FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
    FOREIGN KEY (word_list_id) REFERENCES user_word_list(id) ON DELETE CASCADE
);

CREATE INDEX IF NOT EXISTS idx_word_list_progress_user_id
  ON word_list_progress(user_id);

CREATE INDEX IF NOT EXISTS idx_word_list_progress_word_list_id
  ON word_list_progress(word_list_id);

CREATE TABLE IF NOT EXISTS user_settings (
    user_id TEXT NOT NULL,
    key TEXT NOT NULL,
    value TEXT NOT NULL,
    PRIMARY KEY (user_id, key),
    FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
);

CREATE INDEX IF NOT EXISTS idx_user_settings_user_id
  ON user_settings(user_id);

-------------------------------------------------------------------------------
-- User notes
-------------------------------------------------------------------------------

CREATE TABLE IF NOT EXISTS user_notes (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    user_id TEXT NOT NULL,
    he_phrase TEXT NOT NULL,
    en_phrase TEXT NOT NULL,
    ref_display TEXT NOT NULL,
    sefaria_ref TEXT NOT NULL,
    note_text TEXT NOT NULL,
    created_at INTEGER NOT NULL,
    book_title TEXT,
    book_path TEXT,
    FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
);

CREATE INDEX IF NOT EXISTS idx_user_notes_user_id
  ON user_notes(user_id);

CREATE INDEX IF NOT EXISTS idx_user_notes_created_at
  ON user_notes(created_at DESC);

-------------------------------------------------------------------------------
-- Support tickets
-------------------------------------------------------------------------------

CREATE TABLE IF NOT EXISTS support_tickets (
  id TEXT PRIMARY KEY,
  user_id TEXT NOT NULL,
  email TEXT NOT NULL,
  page_url TEXT,
  type_bug INTEGER NOT NULL DEFAULT 0,
  type_suggestion INTEGER NOT NULL DEFAULT 0,
  type_help INTEGER NOT NULL DEFAULT 0,
  description TEXT NOT NULL,
  status TEXT NOT NULL DEFAULT 'new',
  created_at INTEGER NOT NULL,
  updated_at INTEGER NOT NULL,
  reference TEXT,
  FOREIGN KEY (user_id) REFERENCES users(id)
);

CREATE TABLE IF NOT EXISTS support_ticket_replies (
  id TEXT PRIMARY KEY,
  ticket_id TEXT NOT NULL,
  author_type TEXT NOT NULL,
  author_id TEXT,
  message TEXT NOT NULL,
  created_at INTEGER NOT NULL,
  FOREIGN KEY (ticket_id) REFERENCES support_tickets(id)
);

CREATE INDEX IF NOT EXISTS idx_support_tickets_user_id
  ON support_tickets(user_id);

CREATE INDEX IF NOT EXISTS idx_support_tickets_status
  ON support_tickets(status);

CREATE INDEX IF NOT EXISTS idx_support_ticket_replies_ticket_id
  ON support_ticket_replies(ticket_id);

-------------------------------------------------------------------------------
-- Root translation cache
-------------------------------------------------------------------------------

CREATE TABLE IF NOT EXISTS root_translation_cache (
    root_normalized TEXT PRIMARY KEY,
    meaning TEXT NOT NULL,
    created_at INTEGER NOT NULL
);

-------------------------------------------------------------------------------
-- System settings
-------------------------------------------------------------------------------

CREATE TABLE IF NOT EXISTS system_settings (
    key TEXT NOT NULL PRIMARY KEY,
    value TEXT NOT NULL,
    updated_at INTEGER NOT NULL
);

INSERT OR IGNORE INTO system_settings (key, value, updated_at)
VALUES ('translation_default_model', 'gpt-5.1-chat-latest', strftime('%s', 'now'));

-------------------------------------------------------------------------------
-- Sentence grammar cache
-------------------------------------------------------------------------------

CREATE TABLE IF NOT EXISTS sentence_grammar_cache (
    phrase_hash TEXT PRIMARY KEY,
    phrase TEXT NOT NULL,
    explanation TEXT NOT NULL,
    created_at INTEGER NOT NULL,
    version INTEGER NOT NULL,
    prompt_hash TEXT NOT NULL
);

