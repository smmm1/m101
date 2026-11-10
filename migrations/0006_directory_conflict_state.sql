-- M101 directory optimistic concurrency control.
-- Additive only: existing directory rows and user data are not rewritten.
CREATE TABLE IF NOT EXISTS m101_directory_state (
  id INTEGER PRIMARY KEY CHECK (id = 1),
  revision INTEGER NOT NULL DEFAULT 0,
  last_write_token TEXT
);

INSERT OR IGNORE INTO m101_directory_state (id, revision, last_write_token)
VALUES (1, 0, NULL);

CREATE TABLE IF NOT EXISTS m101_directory_write_tokens (
  token TEXT PRIMARY KEY,
  revision INTEGER,
  created_at TEXT NOT NULL
);
