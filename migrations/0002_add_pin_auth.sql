-- M101 PIN authentication (stored as salted PBKDF2 hash only)
ALTER TABLE users ADD COLUMN pin_hash TEXT;
ALTER TABLE users ADD COLUMN pin_salt TEXT;
CREATE TABLE IF NOT EXISTS pin_login_attempts (
  email TEXT NOT NULL,
  attempted_at INTEGER NOT NULL
);
CREATE INDEX IF NOT EXISTS idx_pin_attempts_email_time
  ON pin_login_attempts(email, attempted_at);
