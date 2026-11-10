-- Additive foundation for M101's owner + equal-collaborator model.
-- This migration intentionally does not seed a workspace, map an owner,
-- backfill existing records, or change any API behavior. Those steps require
-- an explicit legacy-account mapping and a verified D1 backup.

CREATE TABLE IF NOT EXISTS workspaces (
  id TEXT PRIMARY KEY,
  name TEXT NOT NULL,
  owner_user_id TEXT REFERENCES users(id) ON DELETE RESTRICT,
  status TEXT NOT NULL DEFAULT 'active'
    CHECK (status IN ('active', 'archived')),
  created_at TEXT NOT NULL,
  updated_at TEXT NOT NULL
);

CREATE UNIQUE INDEX IF NOT EXISTS idx_workspaces_owner
  ON workspaces(owner_user_id)
  WHERE owner_user_id IS NOT NULL;

CREATE TABLE IF NOT EXISTS workspace_memberships (
  id TEXT PRIMARY KEY,
  workspace_id TEXT NOT NULL REFERENCES workspaces(id) ON DELETE CASCADE,
  user_id TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  membership_type TEXT NOT NULL
    CHECK (membership_type IN ('owner', 'collaborator')),
  status TEXT NOT NULL DEFAULT 'active'
    CHECK (status IN ('active', 'suspended', 'revoked')),
  created_at TEXT NOT NULL,
  updated_at TEXT NOT NULL,
  UNIQUE (workspace_id, user_id)
);

CREATE UNIQUE INDEX IF NOT EXISTS idx_workspace_one_active_owner
  ON workspace_memberships(workspace_id)
  WHERE membership_type = 'owner' AND status = 'active';

CREATE INDEX IF NOT EXISTS idx_workspace_memberships_user
  ON workspace_memberships(user_id, status);

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

CREATE INDEX IF NOT EXISTS idx_workspace_invitations_email
  ON workspace_invitations(workspace_id, email, expires_at);

CREATE TABLE IF NOT EXISTS business_assignments (
  id TEXT PRIMARY KEY,
  workspace_id TEXT NOT NULL REFERENCES workspaces(id) ON DELETE CASCADE,
  business_id TEXT NOT NULL,
  user_id TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  assigned_by TEXT NOT NULL REFERENCES users(id) ON DELETE RESTRICT,
  created_at TEXT NOT NULL,
  UNIQUE (workspace_id, business_id, user_id)
);

CREATE INDEX IF NOT EXISTS idx_business_assignments_user
  ON business_assignments(workspace_id, user_id, business_id);

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

CREATE INDEX IF NOT EXISTS idx_business_relationship_group_business
  ON business_relationship_group_memberships(business_id, group_id);

CREATE TABLE IF NOT EXISTS audit_events (
  id TEXT PRIMARY KEY,
  workspace_id TEXT NOT NULL REFERENCES workspaces(id) ON DELETE CASCADE,
  actor_user_id TEXT REFERENCES users(id) ON DELETE SET NULL,
  action TEXT NOT NULL,
  resource_type TEXT NOT NULL,
  resource_id TEXT,
  metadata_json TEXT NOT NULL DEFAULT '{}'
    CHECK (json_valid(metadata_json)),
  created_at TEXT NOT NULL
);

CREATE INDEX IF NOT EXISTS idx_audit_events_workspace_time
  ON audit_events(workspace_id, created_at DESC);

-- New workspace-scoped directory storage for future staged backfill.
-- The existing directory_year_data table remains untouched and authoritative
-- until the API migration and legacy data mapping are explicitly completed.
CREATE TABLE IF NOT EXISTS workspace_directory_year_data (
  workspace_id TEXT NOT NULL REFERENCES workspaces(id) ON DELETE CASCADE,
  fiscal_year TEXT NOT NULL,
  records TEXT NOT NULL DEFAULT '[]' CHECK (json_valid(records)),
  revision INTEGER NOT NULL DEFAULT 1 CHECK (revision > 0),
  updated_by TEXT REFERENCES users(id) ON DELETE SET NULL,
  updated_at TEXT NOT NULL,
  PRIMARY KEY (workspace_id, fiscal_year)
);

-- Add workspace ownership context for annual tasks without rewriting rows.
-- Existing rows remain NULL until a reviewed legacy-workspace backfill.
ALTER TABLE annual_tasks ADD COLUMN workspace_id TEXT
  REFERENCES workspaces(id) ON DELETE RESTRICT;

CREATE INDEX IF NOT EXISTS idx_annual_tasks_workspace_year
  ON annual_tasks(workspace_id, fiscal_year, due_date);
