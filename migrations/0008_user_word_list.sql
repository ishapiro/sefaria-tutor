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
