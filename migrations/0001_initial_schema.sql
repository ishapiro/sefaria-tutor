-- Cache table: translation_cache
CREATE TABLE IF NOT EXISTS translation_cache (
    phrase_hash TEXT PRIMARY KEY,
    phrase TEXT NOT NULL,
    response TEXT NOT NULL,
    created_at INTEGER NOT NULL
);

-- Stats table: cache_stats
CREATE TABLE IF NOT EXISTS cache_stats (
    id INTEGER PRIMARY KEY,
    hits INTEGER DEFAULT 0,
    misses INTEGER DEFAULT 0,
    updated_at INTEGER NOT NULL
);

-- Initialize stats row if not exists
INSERT OR IGNORE INTO cache_stats (id, hits, misses, updated_at) 
VALUES (1, 0, 0, strftime('%s', 'now'));
