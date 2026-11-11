#!/usr/bin/env python3
"""Regression test for applying M101 migrations to the legacy seeded Owner database."""

from pathlib import Path
import re
import sqlite3

ROOT = Path(__file__).resolve().parents[1]
MIGRATIONS = ROOT / "migrations"
migration_files = sorted(MIGRATIONS.glob("*.sql"))
owner_migration = (MIGRATIONS / "0005_bootstrap_primary_owner_workspace.sql").read_text()
owner_id_match = re.search(r"WHERE id = '([^']+)'", owner_migration)
owner_email_match = re.search(r"lower\(email\)\s*=\s*lower\('([^']+)'\)", owner_migration)
assert owner_id_match and owner_email_match, "Could not read the legacy Owner mapping from migration 0005"
owner_id = owner_id_match.group(1)
owner_email = owner_email_match.group(1)

db = sqlite3.connect(":memory:")
db.execute("PRAGMA foreign_keys = ON")

for migration in migration_files:
    db.executescript(migration.read_text())
    if migration.name == "0001_init.sql":
        db.execute(
            "INSERT INTO users (id, email, display_name, role, password_hash, password_salt, created_at) "
            "VALUES (?, ?, 'Legacy Owner', 'admin', 'legacy-hash', 'legacy-salt', '2026-01-01T00:00:00Z')",
            (owner_id, owner_email),
        )
        db.execute(
            "INSERT INTO directory_year_data (fiscal_year, records, updated_by, updated_at) "
            "VALUES ('69', '[{\"id\":\"legacy-business-1\"}]', ?, '2026-01-01T00:00:00Z')",
            (owner_id,),
        )
    elif migration.name == "0003_annual_tasks.sql":
        db.execute(
            "INSERT INTO annual_tasks (id, fiscal_year, business_id, business_name, task_code, task_name, "
            "status, created_by, updated_by, created_at, updated_at) "
            "VALUES ('legacy-task-1', '69', 'legacy-business-1', 'Legacy Business', 'TAX50', "
            "'Legacy task', 'pending', ?, ?, '2026-01-01T00:00:00Z', '2026-01-01T00:00:00Z')",
            (owner_id, owner_id),
        )

owner = db.execute(
    "SELECT username, account_status, local_password_set, password_hash, password_salt "
    "FROM users WHERE id = ?",
    (owner_id,),
).fetchone()
assert owner == (owner_email.split("@", 1)[0].lower(), "active", 0, "legacy-hash", "legacy-salt"), owner

workspace = db.execute(
    "SELECT id, owner_user_id, status FROM workspaces WHERE owner_user_id = ?",
    (owner_id,),
).fetchone()
assert workspace == ("m101-primary-workspace", owner_id, "active"), workspace

membership = db.execute(
    "SELECT workspace_id, membership_type, status FROM workspace_memberships WHERE user_id = ?",
    (owner_id,),
).fetchone()
assert membership == ("m101-primary-workspace", "owner", "active"), membership

directory = db.execute(
    "SELECT records FROM workspace_directory_year_data WHERE workspace_id = ? AND fiscal_year = '69'",
    (workspace[0],),
).fetchone()
assert directory == ('[{"id":"legacy-business-1"}]',), directory

task = db.execute(
    "SELECT workspace_id FROM annual_tasks WHERE id = 'legacy-task-1'"
).fetchone()
assert task == (workspace[0],), task

# Exercise the exact conditional INSERT used by login/bootstrap rate limiting.
attempt_key = "test-auth-attempt-key"
reservation_sql = (
    "INSERT INTO auth_rate_limit_attempts (attempt_key, attempted_at) "
    "SELECT ?, ? WHERE (SELECT COUNT(*) FROM auth_rate_limit_attempts "
    "WHERE attempt_key = ? AND attempted_at > ?) < 5"
)
for attempt in range(5):
    result = db.execute(reservation_sql, (attempt_key, 1000 + attempt, attempt_key, 0))
    assert result.rowcount == 1, f"reservation {attempt + 1} unexpectedly rejected"
blocked = db.execute(reservation_sql, (attempt_key, 1005, attempt_key, 0))
assert blocked.rowcount == 0, "sixth attempt should be blocked"

# Owner-managed account guards: case-insensitive uniqueness and workspace-scoped updates.
member_id = "test-member-1"
db.execute(
    "INSERT INTO users (id, email, display_name, role, password_hash, password_salt, created_at, username, account_status, local_password_set) "
    "VALUES (?, ?, 'Test Member', 'member', 'hash', 'salt', '2026-01-02T00:00:00Z', 'member01', 'active', 1)",
    (member_id, "member01@m101.local"),
)
db.execute(
    "INSERT INTO workspace_memberships (id, workspace_id, user_id, membership_type, status, created_at, updated_at) "
    "VALUES ('test-member-membership', ?, ?, 'collaborator', 'active', '2026-01-02T00:00:00Z', '2026-01-02T00:00:00Z')",
    (workspace[0], member_id),
)
try:
    db.execute(
        "INSERT INTO users (id, email, display_name, role, password_hash, password_salt, created_at, username, account_status, local_password_set) "
        "VALUES ('test-member-duplicate', 'duplicate@m101.local', 'Duplicate', 'member', 'hash', 'salt', '2026-01-02T00:00:00Z', 'MEMBER01', 'active', 1)"
    )
    raise AssertionError("case-insensitive duplicate username should be rejected")
except sqlite3.IntegrityError:
    pass

guarded_member_update = (
    "UPDATE users SET username = ?, display_name = ?, account_status = ? "
    "WHERE id = ? AND role = 'member' AND EXISTS ("
    "SELECT 1 FROM workspace_memberships wm JOIN workspaces w ON w.id = wm.workspace_id "
    "WHERE wm.user_id = users.id AND wm.workspace_id = ? "
    "AND wm.membership_type = 'collaborator' AND wm.status = 'active' AND w.status = 'active')"
)
updated = db.execute(
    guarded_member_update,
    ("member02", "Updated Member", "active", member_id, workspace[0]),
)
assert updated.rowcount == 1, "active member in Owner workspace should be updateable"
db.execute(
    "UPDATE workspace_memberships SET status = 'revoked' WHERE user_id = ? AND workspace_id = ?",
    (member_id, workspace[0]),
)
revoked = db.execute(
    guarded_member_update,
    ("member03", "Should Not Update", "active", member_id, workspace[0]),
)
assert revoked.rowcount == 0, "member removed from workspace must not be updateable"
current_member = db.execute(
    "SELECT username, display_name FROM users WHERE id = ?", (member_id,)
).fetchone()
assert current_member == ("member02", "Updated Member"), current_member

# Owner password reset revokes sessions only when the newly written hash matches.
db.execute(
    "INSERT INTO sessions (token_hash, user_id, expires_at, created_at) VALUES ('member-session-reset', ?, 9999999999, '2026-01-02T00:00:00Z')",
    (member_id,),
)
db.execute("UPDATE users SET password_hash = 'new-member-hash', local_password_set = 1 WHERE id = ?", (member_id,))
revoke_after_password_reset = db.execute(
    "DELETE FROM sessions WHERE user_id = ? AND ((? = 1 AND EXISTS "
    "(SELECT 1 FROM users WHERE id = ? AND password_hash = ? AND local_password_set = 1)) "
    "OR (? = 'suspended' AND EXISTS (SELECT 1 FROM users WHERE id = ? AND account_status = 'suspended')))",
    (member_id, 1, member_id, "new-member-hash", "active", member_id),
)
assert revoke_after_password_reset.rowcount == 1, "password reset must revoke all member sessions"

# Suspension uses the same conditional revocation predicate.
db.execute(
    "INSERT INTO sessions (token_hash, user_id, expires_at, created_at) VALUES ('member-session-suspend', ?, 9999999999, '2026-01-02T00:00:00Z')",
    (member_id,),
)
db.execute("UPDATE users SET account_status = 'suspended' WHERE id = ?", (member_id,))
revoke_after_suspension = db.execute(
    "DELETE FROM sessions WHERE user_id = ? AND ((? = 1 AND EXISTS "
    "(SELECT 1 FROM users WHERE id = ? AND password_hash = ? AND local_password_set = 1)) "
    "OR (? = 'suspended' AND EXISTS (SELECT 1 FROM users WHERE id = ? AND account_status = 'suspended')))",
    (member_id, 0, member_id, "", "suspended", member_id),
)
assert revoke_after_suspension.rowcount == 1, "suspension must revoke all member sessions"


# Workspace assignment and annual-task writes re-check authorization in the
# mutating SQL statement, so a concurrent assignment revocation cannot race
# between an application-level permission check and the write.
assignment_id = "test-assignment-1"
assignment_insert = (
    "INSERT INTO business_assignments (id, workspace_id, business_id, user_id, assigned_by, created_at) "
    "SELECT ?, ?, ?, ?, ?, ? WHERE EXISTS (SELECT 1 FROM workspace_memberships wm "
    "JOIN workspaces w ON w.id = wm.workspace_id WHERE wm.workspace_id = ? AND wm.user_id = ? "
    "AND wm.membership_type = 'collaborator' AND wm.status = 'active' AND w.status = 'active') "
    "AND EXISTS (SELECT 1 FROM workspace_memberships owner_membership "
    "JOIN workspaces owner_workspace ON owner_workspace.id = owner_membership.workspace_id "
    "WHERE owner_membership.workspace_id = ? AND owner_membership.user_id = ? "
    "AND owner_membership.membership_type = 'owner' AND owner_membership.status = 'active' "
    "AND owner_workspace.status = 'active')"
)
assigned = db.execute(
    assignment_insert,
    (assignment_id, workspace[0], "legacy-business-1", member_id, owner_id,
     "2026-01-03T00:00:00Z", workspace[0], member_id, workspace[0], owner_id),
)
assert assigned.rowcount == 1, "active Owner and collaborator should be able to create an assignment"

guarded_task_insert = (
    "INSERT INTO annual_tasks (id, workspace_id, fiscal_year, business_id, business_name, task_code, "
    "task_name, status, created_by, updated_by, created_at, updated_at) "
    "SELECT ?, ?, '69', ?, 'Legacy Business', 'TAX51', 'Assigned task', 'pending', ?, ?, ?, ? "
    "WHERE EXISTS (SELECT 1 FROM workspace_memberships wm JOIN workspaces w ON w.id = wm.workspace_id "
    "WHERE wm.user_id = ? AND wm.workspace_id = ? AND wm.membership_type = ? "
    "AND wm.status = 'active' AND w.status = 'active') "
    "AND (? = 'owner' OR EXISTS (SELECT 1 FROM business_assignments ba "
    "WHERE ba.workspace_id = ? AND ba.business_id = ? AND ba.user_id = ?))"
)
task_inserted = db.execute(
    guarded_task_insert,
    ("assigned-task-1", workspace[0], "legacy-business-1", member_id, member_id,
     "2026-01-03T00:00:00Z", "2026-01-03T00:00:00Z", member_id, workspace[0],
     "collaborator", "collaborator", workspace[0], "legacy-business-1", member_id),
)
assert task_inserted.rowcount == 1, "assigned collaborator should be able to create an annual task"

db.execute("DELETE FROM business_assignments WHERE id = ? AND workspace_id = ?", (assignment_id, workspace[0]))
guarded_task_update = (
    "UPDATE annual_tasks SET task_name = 'Should not update' WHERE id = ? AND workspace_id = ? "
    "AND EXISTS (SELECT 1 FROM workspace_memberships wm JOIN workspaces w ON w.id = wm.workspace_id "
    "WHERE wm.user_id = ? AND wm.workspace_id = ? AND wm.membership_type = ? "
    "AND wm.status = 'active' AND w.status = 'active') "
    "AND (? = 'owner' OR EXISTS (SELECT 1 FROM business_assignments ba "
    "WHERE ba.workspace_id = ? AND ba.business_id = annual_tasks.business_id AND ba.user_id = ?))"
)
revoked_update = db.execute(
    guarded_task_update,
    ("assigned-task-1", workspace[0], member_id, workspace[0], "collaborator",
     "collaborator", workspace[0], member_id),
)
assert revoked_update.rowcount == 0, "revoked assignment must block an in-flight annual-task update"

guarded_task_delete = (
    "DELETE FROM annual_tasks WHERE id = ? AND workspace_id = ? "
    "AND EXISTS (SELECT 1 FROM workspace_memberships wm JOIN workspaces w ON w.id = wm.workspace_id "
    "WHERE wm.user_id = ? AND wm.workspace_id = ? AND wm.membership_type = ? "
    "AND wm.status = 'active' AND w.status = 'active') "
    "AND (? = 'owner' OR EXISTS (SELECT 1 FROM business_assignments ba "
    "WHERE ba.workspace_id = ? AND ba.business_id = annual_tasks.business_id AND ba.user_id = ?))"
)
revoked_delete = db.execute(
    guarded_task_delete,
    ("assigned-task-1", workspace[0], member_id, workspace[0], "collaborator",
     "collaborator", workspace[0], member_id),
)
assert revoked_delete.rowcount == 0, "revoked assignment must block an in-flight annual-task deletion"

db.close()
print("Legacy Owner migration, atomic auth rate limiting, Owner account guards, and workspace assignment revocation checks passed.")

