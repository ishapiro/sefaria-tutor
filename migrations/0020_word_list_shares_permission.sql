-- Add per-share permission: 'read' (default) or 'write'
ALTER TABLE word_list_shares ADD COLUMN permission TEXT NOT NULL DEFAULT 'read';
