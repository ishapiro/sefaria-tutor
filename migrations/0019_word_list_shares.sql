-- Sharing: allows a list owner to grant read access to other users by email
CREATE TABLE IF NOT EXISTS word_list_shares (
  id         INTEGER PRIMARY KEY AUTOINCREMENT,
  list_id    INTEGER NOT NULL,
  owner_id   TEXT    NOT NULL,
  shared_with_email   TEXT NOT NULL,
  shared_with_user_id TEXT,           -- resolved at share time; NULL if no account yet
  created_at INTEGER NOT NULL,
  UNIQUE (list_id, shared_with_email),
  FOREIGN KEY (list_id)  REFERENCES word_lists(id)  ON DELETE CASCADE,
  FOREIGN KEY (owner_id) REFERENCES users(id)        ON DELETE CASCADE
);

CREATE INDEX IF NOT EXISTS idx_word_list_shares_list_id           ON word_list_shares(list_id);
CREATE INDEX IF NOT EXISTS idx_word_list_shares_shared_with_user  ON word_list_shares(shared_with_user_id);
CREATE INDEX IF NOT EXISTS idx_word_list_shares_shared_with_email ON word_list_shares(shared_with_email);
