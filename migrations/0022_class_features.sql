-- Phase 1: class-level word list sharing + teacher note publishing

-- 1) Allow word_list_shares to target an entire class (team)
ALTER TABLE word_list_shares ADD COLUMN shared_with_team_id TEXT REFERENCES teams(id) ON DELETE CASCADE;
CREATE INDEX IF NOT EXISTS idx_word_list_shares_team ON word_list_shares(shared_with_team_id);

-- 2) Teacher-published notes (junction: teacher note → class)
CREATE TABLE IF NOT EXISTS class_notes (
  id           INTEGER PRIMARY KEY AUTOINCREMENT,
  team_id      TEXT    NOT NULL,
  teacher_id   TEXT    NOT NULL,
  note_id      INTEGER NOT NULL,
  published_at INTEGER NOT NULL,
  UNIQUE (team_id, note_id),
  FOREIGN KEY (team_id)    REFERENCES teams(id)      ON DELETE CASCADE,
  FOREIGN KEY (teacher_id) REFERENCES users(id)      ON DELETE CASCADE,
  FOREIGN KEY (note_id)    REFERENCES user_notes(id) ON DELETE CASCADE
);
CREATE INDEX IF NOT EXISTS idx_class_notes_team    ON class_notes(team_id);
CREATE INDEX IF NOT EXISTS idx_class_notes_teacher ON class_notes(teacher_id);
