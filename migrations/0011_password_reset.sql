-- Password reset: one-time token with expiry (for email/password accounts only)
ALTER TABLE users ADD COLUMN password_reset_token TEXT;
ALTER TABLE users ADD COLUMN password_reset_expires_at INTEGER;

CREATE INDEX IF NOT EXISTS idx_users_password_reset_token ON users(password_reset_token);
