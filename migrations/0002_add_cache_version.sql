-- Add version column to translation_cache
ALTER TABLE translation_cache ADD COLUMN version INTEGER DEFAULT 1;
