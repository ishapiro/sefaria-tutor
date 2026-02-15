-- Flashcard/study feature: archive, progress, user settings
-- Checkpoint 1: Schema only. Run and test DB before changing API/UI.

-- 1) Add archived_at to user_word_list (switch from permanent delete to archive)
ALTER TABLE user_word_list ADD COLUMN archived_at INTEGER NULL;
CREATE INDEX IF NOT EXISTS idx_user_word_list_archived_at ON user_word_list(archived_at);

-- 2) Per-word progress for study (times shown, times correct, attempts until first correct)
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
CREATE INDEX IF NOT EXISTS idx_word_list_progress_user_id ON word_list_progress(user_id);
CREATE INDEX IF NOT EXISTS idx_word_list_progress_word_list_id ON word_list_progress(word_list_id);

-- 3) User settings (e.g. flashcard_correct_repetitions)
CREATE TABLE IF NOT EXISTS user_settings (
    user_id TEXT NOT NULL,
    key TEXT NOT NULL,
    value TEXT NOT NULL,
    PRIMARY KEY (user_id, key),
    FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
);
CREATE INDEX IF NOT EXISTS idx_user_settings_user_id ON user_settings(user_id);
