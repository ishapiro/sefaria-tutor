-- Add malformed_hits to cache_stats
ALTER TABLE cache_stats ADD COLUMN malformed_hits INTEGER DEFAULT 0;
