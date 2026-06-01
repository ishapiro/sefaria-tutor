-- Track who added each word (may differ from the list owner on shared write-access lists)
ALTER TABLE user_word_list ADD COLUMN added_by_user_id TEXT REFERENCES users(id) ON DELETE SET NULL;

CREATE INDEX IF NOT EXISTS idx_user_word_list_added_by ON user_word_list(added_by_user_id);
