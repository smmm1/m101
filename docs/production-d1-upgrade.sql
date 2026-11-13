-- M101 Production D1 upgrade plan
-- Prepared against a read-only inspection of the current Production schema on 2026-11-13.
-- This file is intentionally NOT in migrations/: do not auto-apply it from a Pages build.
-- Run only after taking a D1 backup and reviewing the preflight queries below.
-- All legacy tables are retained. No DELETE, DROP, or replacement of legacy records occurs.

-- PRE-FLIGHT (run separately and verify before proceeding):
-- SELECT COUNT(*) AS users FROM users;
-- SELECT id, email, role FROM users;
-- SELECT fiscal_year, json_array_length(records) AS records FROM directory_year_data;
-- SELECT COUNT(*) AS annual_tasks FROM annual_tasks;
-- Expected at preparation time: 1 admin user, 480 records in fiscal year 69, 0 annual tasks.

-- 1. Extend existing user accounts without changing password hashes or sessions.
-- Legacy password hashes are retained for rollback, but are not assumed to be PBKDF2.
-- Mark existing accounts as needing the new local-password bootstrap so the Owner
-- can claim the legacy admin safely and set a password understood by the new API.
ALTER TABLE users ADD COLUMN username TEXT;
ALTER TABLE users ADD COLUMN account_status TEXT NOT NULL DEFAULT 'active'
  CHECK (account_status IN ('active', 'suspended'));
ALTER TABLE users ADD COLUMN local_password_set INTEGER NOT NULL DEFAULT 0
  CHECK (local_password_set IN (0, 1));

UPDATE users
SET username = lower(substr(email, 1, instr(email, '@') - 1))
WHERE username IS NULL OR trim(username) = '';

UPDATE users SET local_password_set = 0;

CREATE UNIQUE INDEX IF NOT EXISTS idx_users_username
  ON users(username COLLATE NOCASE);

-- 2. Create the single M101 workspace and link the existing admin as its Owner.
CREATE TABLE IF NOT EXISTS workspaces (
  id TEXT PRIMARY KEY,
  name TEXT NOT NULL,
  owner_user_id TEXT REFERENCES users(id) ON DELETE RESTRICT,
  status TEXT NOT NULL DEFAULT 'active' CHECK (status IN ('active', 'archived')),
  created_at TEXT NOT NULL,
  updated_at TEXT NOT NULL,
  directory_revision INTEGER NOT NULL DEFAULT 1 CHECK (directory_revision > 0),
  directory_write_token TEXT
);

INSERT OR IGNORE INTO workspaces
  (id, name, owner_user_id, status, created_at, updated_at, directory_revision, directory_write_token)
SELECT
  'm101-primary-workspace', 'M101 Workspace', id, 'active',
  strftime('%Y-%m-%dT%H:%M:%fZ', 'now'),
  strftime('%Y-%m-%dT%H:%M:%fZ', 'now'), 1, NULL
FROM users
WHERE role = 'admin'
ORDER BY created_at
LIMIT 1;

CREATE TABLE IF NOT EXISTS workspace_memberships (
  id TEXT PRIMARY KEY,
  workspace_id TEXT NOT NULL REFERENCES workspaces(id) ON DELETE CASCADE,
  user_id TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  membership_type TEXT NOT NULL CHECK (membership_type IN ('owner', 'collaborator')),
  status TEXT NOT NULL DEFAULT 'active' CHECK (status IN ('active', 'suspended', 'revoked')),
  created_at TEXT NOT NULL,
  updated_at TEXT NOT NULL,
  UNIQUE (workspace_id, user_id)
);

INSERT OR IGNORE INTO workspace_memberships
  (id, workspace_id, user_id, membership_type, status, created_at, updated_at)
SELECT
  'm101-owner-' || u.id, w.id, u.id, 'owner', 'active',
  strftime('%Y-%m-%dT%H:%M:%fZ', 'now'),
  strftime('%Y-%m-%dT%H:%M:%fZ', 'now')
FROM users u
JOIN workspaces w ON w.owner_user_id = u.id
WHERE u.role = 'admin';

-- 3. Copy every legacy annual directory snapshot into the workspace-scoped table.
CREATE TABLE IF NOT EXISTS workspace_directory_year_data (
  workspace_id TEXT NOT NULL REFERENCES workspaces(id) ON DELETE CASCADE,
  fiscal_year TEXT NOT NULL,
  records TEXT NOT NULL DEFAULT '[]' CHECK (json_valid(records)),
  revision INTEGER NOT NULL DEFAULT 1 CHECK (revision > 0),
  updated_by TEXT REFERENCES users(id) ON DELETE SET NULL,
  updated_at TEXT NOT NULL,
  PRIMARY KEY (workspace_id, fiscal_year)
);

INSERT OR IGNORE INTO workspace_directory_year_data
  (workspace_id, fiscal_year, records, revision, updated_by, updated_at)
SELECT w.id, d.fiscal_year, d.records, 1, d.updated_by, d.updated_at
FROM directory_year_data d
CROSS JOIN workspaces w
WHERE w.id = 'm101-primary-workspace';

-- 4. Add workspace ownership to existing annual tasks; preserve all task rows.
ALTER TABLE annual_tasks
  ADD COLUMN workspace_id TEXT REFERENCES workspaces(id) ON DELETE RESTRICT;

UPDATE annual_tasks
SET workspace_id = 'm101-primary-workspace'
WHERE workspace_id IS NULL;

CREATE INDEX IF NOT EXISTS idx_annual_tasks_workspace_year
  ON annual_tasks(workspace_id, fiscal_year);

-- 5. Workspace audit and access-control tables used by the current Worker API.
CREATE TABLE IF NOT EXISTS audit_events (
  id TEXT PRIMARY KEY,
  workspace_id TEXT NOT NULL REFERENCES workspaces(id) ON DELETE CASCADE,
  actor_user_id TEXT REFERENCES users(id) ON DELETE SET NULL,
  action TEXT NOT NULL,
  resource_type TEXT NOT NULL,
  resource_id TEXT,
  metadata_json TEXT NOT NULL DEFAULT '{}' CHECK (json_valid(metadata_json)),
  created_at TEXT NOT NULL
);

CREATE TABLE IF NOT EXISTS auth_rate_limit_attempts (
  attempt_key TEXT NOT NULL,
  attempted_at INTEGER NOT NULL
);
CREATE INDEX IF NOT EXISTS idx_auth_rate_limit_attempts_key_time
  ON auth_rate_limit_attempts(attempt_key, attempted_at);

CREATE TABLE IF NOT EXISTS business_assignments (
  id TEXT PRIMARY KEY,
  workspace_id TEXT NOT NULL REFERENCES workspaces(id) ON DELETE CASCADE,
  business_id TEXT NOT NULL,
  user_id TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  assigned_by TEXT NOT NULL REFERENCES users(id) ON DELETE RESTRICT,
  created_at TEXT NOT NULL,
  UNIQUE (workspace_id, business_id, user_id)
);

CREATE TABLE IF NOT EXISTS business_credential_grants (
  id TEXT PRIMARY KEY,
  workspace_id TEXT NOT NULL REFERENCES workspaces(id) ON DELETE CASCADE,
  business_id TEXT NOT NULL,
  user_id TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  granted_by TEXT NOT NULL REFERENCES users(id) ON DELETE RESTRICT,
  created_at TEXT NOT NULL,
  UNIQUE (workspace_id, business_id, user_id)
);

CREATE TABLE IF NOT EXISTS business_relationship_groups (
  id TEXT PRIMARY KEY,
  workspace_id TEXT NOT NULL REFERENCES workspaces(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  created_at TEXT NOT NULL,
  updated_at TEXT NOT NULL,
  UNIQUE (workspace_id, name)
);

CREATE TABLE IF NOT EXISTS business_relationship_group_memberships (
  group_id TEXT NOT NULL REFERENCES business_relationship_groups(id) ON DELETE CASCADE,
  business_id TEXT NOT NULL,
  created_at TEXT NOT NULL,
  PRIMARY KEY (group_id, business_id)
);

CREATE TABLE IF NOT EXISTS workspace_invitations (
  id TEXT PRIMARY KEY,
  workspace_id TEXT NOT NULL REFERENCES workspaces(id) ON DELETE CASCADE,
  email TEXT NOT NULL COLLATE NOCASE,
  token_hash TEXT NOT NULL UNIQUE,
  expires_at INTEGER NOT NULL,
  invited_by TEXT NOT NULL REFERENCES users(id) ON DELETE RESTRICT,
  accepted_by TEXT REFERENCES users(id) ON DELETE SET NULL,
  accepted_at TEXT,
  revoked_at TEXT,
  created_at TEXT NOT NULL,
  CHECK (accepted_at IS NULL OR accepted_by IS NOT NULL)
);

CREATE INDEX IF NOT EXISTS idx_workspace_memberships_user_status
  ON workspace_memberships(user_id, status);
CREATE INDEX IF NOT EXISTS idx_business_assignments_user
  ON business_assignments(workspace_id, user_id);
CREATE INDEX IF NOT EXISTS idx_audit_events_workspace_time
  ON audit_events(workspace_id, created_at);

-- POST-FLIGHT (run separately and compare against the pre-flight counts):
-- SELECT COUNT(*) AS users FROM users;
-- SELECT id, role, username, account_status, local_password_set FROM users;
-- SELECT id, owner_user_id, status, directory_revision FROM workspaces;
-- SELECT membership_type, status, COUNT(*) FROM workspace_memberships GROUP BY membership_type, status;
-- SELECT fiscal_year, json_array_length(records) AS records FROM directory_year_data;
-- SELECT fiscal_year, json_array_length(records) AS records
--   FROM workspace_directory_year_data WHERE workspace_id = 'm101-primary-workspace';
-- SELECT COUNT(*) AS annual_tasks FROM annual_tasks;
-- SELECT COUNT(*) AS unscoped_tasks FROM annual_tasks WHERE workspace_id IS NULL;

-- Keep directory_year_data as the rollback source until the new application has
-- passed login, record-count, CRUD, import/export, and role-isolation acceptance tests.
