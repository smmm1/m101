-- Bootstrap the first M101 workspace for the explicitly confirmed existing owner.
-- This migration is additive and preserves the legacy tables/rows. It only creates
-- the workspace when the exact existing M101 account is present.

INSERT OR IGNORE INTO workspaces (
  id, name, owner_user_id, status, created_at, updated_at
)
SELECT
  'm101-primary-workspace',
  'M101 Workspace',
  id,
  'active',
  strftime('%Y-%m-%dT%H:%M:%fZ', 'now'),
  strftime('%Y-%m-%dT%H:%M:%fZ', 'now')
FROM users
WHERE id = 'x8wLRj5Iw1zqsyWnMrF65w'
  AND lower(email) = lower('s2mtha16@gmail.com');

INSERT OR IGNORE INTO workspace_memberships (
  id, workspace_id, user_id, membership_type, status, created_at, updated_at
)
SELECT
  'm101-primary-owner-membership',
  'm101-primary-workspace',
  id,
  'owner',
  'active',
  strftime('%Y-%m-%dT%H:%M:%fZ', 'now'),
  strftime('%Y-%m-%dT%H:%M:%fZ', 'now')
FROM users
WHERE id = 'x8wLRj5Iw1zqsyWnMrF65w'
  AND lower(email) = lower('s2mtha16@gmail.com')
  AND EXISTS (
    SELECT 1 FROM workspaces
    WHERE id = 'm101-primary-workspace'
      AND owner_user_id = 'x8wLRj5Iw1zqsyWnMrF65w'
  );

-- Copy legacy directory snapshots into the workspace-scoped table.
-- The original directory_year_data rows remain untouched for rollback.
INSERT OR IGNORE INTO workspace_directory_year_data (
  workspace_id, fiscal_year, records, revision, updated_by, updated_at
)
SELECT
  'm101-primary-workspace',
  fiscal_year,
  records,
  1,
  CASE WHEN EXISTS (SELECT 1 FROM users u WHERE u.id = directory_year_data.updated_by) THEN updated_by ELSE NULL END,
  updated_at
FROM directory_year_data
WHERE EXISTS (
  SELECT 1 FROM workspace_memberships
  WHERE workspace_id = 'm101-primary-workspace'
    AND user_id = 'x8wLRj5Iw1zqsyWnMrF65w'
    AND membership_type = 'owner'
    AND status = 'active'
);

-- Associate existing annual tasks without changing their business/task fields.
UPDATE annual_tasks
SET workspace_id = 'm101-primary-workspace'
WHERE workspace_id IS NULL
  AND EXISTS (
    SELECT 1 FROM workspace_memberships
    WHERE workspace_id = 'm101-primary-workspace'
      AND user_id = 'x8wLRj5Iw1zqsyWnMrF65w'
      AND membership_type = 'owner'
      AND status = 'active'
  );
