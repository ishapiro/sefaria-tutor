-- Named word lists: allows users to organize words into multiple named lists
-- Words with list_id IS NULL belong to the implicit "Default" list (backward compat)

CREATE TABLE IF NOT EXISTS word_lists (
  id         INTEGER PRIMARY KEY AUTOINCREMENT,
  user_id    TEXT    NOT NULL,
  name       TEXT    NOT NULL,
  created_at INTEGER NOT NULL,
  updated_at INTEGER NOT NULL,
  FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
);

CREATE INDEX IF NOT EXISTS idx_word_lists_user_id ON word_lists(user_id);

ALTER TABLE user_word_list ADD COLUMN list_id INTEGER REFERENCES word_lists(id) ON DELETE SET NULL;

CREATE INDEX IF NOT EXISTS idx_user_word_list_list_id ON user_word_list(list_id);
