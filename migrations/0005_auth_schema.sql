-- Auth Schema: Users and Teams

-- Profile information and role management
CREATE TABLE IF NOT EXISTS users (
  id TEXT PRIMARY KEY,          -- Unique ID from Auth Provider (e.g., Google Sub) or generated UUID
  email TEXT UNIQUE NOT NULL,
  name TEXT,
  role TEXT DEFAULT 'general',  -- 'general', 'team', 'admin'
  password_hash TEXT,           -- Hashed password for email-only accounts
  is_verified BOOLEAN DEFAULT FALSE,
  verification_token TEXT,
  token_expires_at INTEGER,
  team_id TEXT,                 -- Association with a team
  created_at INTEGER DEFAULT (strftime('%s', 'now')),
  FOREIGN KEY (team_id) REFERENCES teams(id)
);

-- Team management for schools/classes
CREATE TABLE IF NOT EXISTS teams (
  id TEXT PRIMARY KEY,          -- Unique Team ID
  name TEXT NOT NULL,
  leader_id TEXT NOT NULL,      -- FK to users.id (The Team user)
  invite_code TEXT UNIQUE,      -- Code for General users to join
  created_at INTEGER DEFAULT (strftime('%s', 'now')),
  FOREIGN KEY (leader_id) REFERENCES users(id)
);
