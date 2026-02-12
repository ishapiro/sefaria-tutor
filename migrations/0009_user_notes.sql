-- User notes table (phrase-level notes with Hebrew, English, reference, and plain text note)
CREATE TABLE IF NOT EXISTS user_notes (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    user_id TEXT NOT NULL,
    he_phrase TEXT NOT NULL,
    en_phrase TEXT NOT NULL,
    ref_display TEXT NOT NULL,
    sefaria_ref TEXT NOT NULL,
    note_text TEXT NOT NULL,
    created_at INTEGER NOT NULL,
    FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
);

CREATE INDEX IF NOT EXISTS idx_user_notes_user_id ON user_notes(user_id);
CREATE INDEX IF NOT EXISTS idx_user_notes_created_at ON user_notes(created_at DESC);
