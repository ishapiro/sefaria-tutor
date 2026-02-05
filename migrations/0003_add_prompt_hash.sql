-- Add prompt_hash column to track instruction versions
ALTER TABLE translation_cache ADD COLUMN prompt_hash TEXT;
