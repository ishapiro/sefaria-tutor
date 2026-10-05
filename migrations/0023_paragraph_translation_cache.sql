-- Paragraph translation cache: plain English translations for "Translate chapter", keyed by normalized paragraph
CREATE TABLE IF NOT EXISTS paragraph_translation_cache (
    paragraph_hash TEXT PRIMARY KEY,
    paragraph TEXT NOT NULL,
    translation TEXT NOT NULL,
    created_at INTEGER NOT NULL,
    version INTEGER NOT NULL,
    prompt_hash TEXT NOT NULL
);
