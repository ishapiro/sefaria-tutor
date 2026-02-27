-- Sentence grammar cache table: stores grammar explanations keyed by normalized phrase
CREATE TABLE IF NOT EXISTS sentence_grammar_cache (
    phrase_hash TEXT PRIMARY KEY,
    phrase TEXT NOT NULL,
    explanation TEXT NOT NULL,
    created_at INTEGER NOT NULL,
    version INTEGER NOT NULL,
    prompt_hash TEXT NOT NULL
);

