PRAGMA foreign_keys = ON;

CREATE TABLE IF NOT EXISTS m101_users (
  id TEXT PRIMARY KEY,
  email TEXT NOT NULL UNIQUE COLLATE NOCASE,
  password_hash TEXT NOT NULL,
  role TEXT NOT NULL CHECK (role IN ('admin','member')),
  created_at TEXT NOT NULL DEFAULT (datetime('now'))
);

CREATE TABLE IF NOT EXISTS m101_sessions (
  id TEXT PRIMARY KEY,
  user_id TEXT NOT NULL REFERENCES m101_users(id) ON DELETE CASCADE,
  token_hash TEXT NOT NULL UNIQUE,
  expires_at TEXT NOT NULL,
  created_at TEXT NOT NULL DEFAULT (datetime('now'))
);
CREATE INDEX IF NOT EXISTS idx_m101_sessions_expiry ON m101_sessions(expires_at);

CREATE TABLE IF NOT EXISTS m101_directory_year_data (
  fiscal_year TEXT PRIMARY KEY,
  records TEXT NOT NULL DEFAULT '[]' CHECK (json_valid(records)),
  updated_by TEXT REFERENCES m101_users(id) ON DELETE SET NULL,
  updated_at TEXT NOT NULL DEFAULT (datetime('now'))
);
