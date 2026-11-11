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

db.close()
print("Legacy Owner migration and atomic auth rate-limit checks passed.")
