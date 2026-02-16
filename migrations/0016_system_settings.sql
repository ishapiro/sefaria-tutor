-- System-wide settings (admin-configurable, e.g. default translation model)
CREATE TABLE IF NOT EXISTS system_settings (
    key TEXT NOT NULL PRIMARY KEY,
    value TEXT NOT NULL,
    updated_at INTEGER NOT NULL
);

-- Seed default translation model
INSERT OR IGNORE INTO system_settings (key, value, updated_at)
VALUES ('translation_default_model', 'gpt-5.1-chat-latest', strftime('%s', 'now'));