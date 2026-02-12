-- Add book title and path to notes for in-app navigation (same as word list)
ALTER TABLE user_notes ADD COLUMN book_title TEXT;
ALTER TABLE user_notes ADD COLUMN book_path TEXT;
