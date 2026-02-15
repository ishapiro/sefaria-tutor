-- Root translation cache for Concordance Word Explorer (Hebrew root → brief English meaning).
CREATE TABLE IF NOT EXISTS root_translation_cache (
    root_normalized TEXT PRIMARY KEY,
    meaning TEXT NOT NULL,
    created_at INTEGER NOT NULL
);
