-- Local M101 accounts: Owner-managed usernames and password authentication.
-- Existing email values are retained for audit/backward compatibility; login uses username.
ALTER TABLE users ADD COLUMN username TEXT;
ALTER TABLE users ADD COLUMN account_status TEXT NOT NULL DEFAULT 'active'
  CHECK (account_status IN ('active', 'suspended'));

UPDATE users
SET username = lower(substr(email, 1, instr(email, '@') - 1))
WHERE username IS NULL AND instr(email, '@') > 1;

CREATE UNIQUE INDEX IF NOT EXISTS idx_users_username_unique
  ON users(username COLLATE NOCASE)
  WHERE username IS NOT NULL;

-- Exactly one active Owner account across the entire M101 database.
CREATE UNIQUE INDEX IF NOT EXISTS idx_one_active_m101_owner
  ON workspace_memberships(membership_type)
  WHERE membership_type = 'owner' AND status = 'active';

CREATE TABLE IF NOT EXISTS password_login_attempts (
  attempt_key TEXT NOT NULL,
  attempted_at INTEGER NOT NULL
);
CREATE INDEX IF NOT EXISTS idx_password_login_attempts_key_time
  ON password_login_attempts(attempt_key, attempted_at);
