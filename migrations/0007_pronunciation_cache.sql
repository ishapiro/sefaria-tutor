-- Pronunciation cache table: stores metadata for cached audio files
CREATE TABLE IF NOT EXISTS pronunciation_cache (
    text_hash TEXT PRIMARY KEY,
    normalized_text TEXT NOT NULL,
    r2_key TEXT NOT NULL,
    file_size_bytes INTEGER NOT NULL,
    created_at INTEGER NOT NULL,
    last_accessed_at INTEGER NOT NULL,
    access_count INTEGER DEFAULT 0
);

-- Index for efficient LRU purging (sorted by last_accessed_at)
CREATE INDEX IF NOT EXISTS idx_pronunciation_last_accessed ON pronunciation_cache(last_accessed_at);

-- Index for searching by normalized text
CREATE INDEX IF NOT EXISTS idx_pronunciation_text ON pronunciation_cache(normalized_text);

-- Pronunciation cache statistics table
CREATE TABLE IF NOT EXISTS pronunciation_cache_stats (
    id INTEGER PRIMARY KEY,
    total_size_bytes INTEGER DEFAULT 0,
    total_files INTEGER DEFAULT 0,
    hits INTEGER DEFAULT 0,
    misses INTEGER DEFAULT 0,
    last_purge_at INTEGER,
    updated_at INTEGER NOT NULL
);

-- Initialize stats row if not exists
INSERT OR IGNORE INTO pronunciation_cache_stats (id, total_size_bytes, total_files, hits, misses, updated_at) 
VALUES (1, 0, 0, 0, 0, strftime('%s', 'now'));
