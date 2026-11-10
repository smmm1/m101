#!/usr/bin/env python3
"""SQLite regression test for M101's workspace directory compare-and-swap writes.

This executes the same SQL predicates used by functions/api/[[path]].ts against
an isolated in-memory database. It never connects to Cloudflare or production.
"""
import json
import sqlite3


def make_db():
    db = sqlite3.connect(":memory:")
    db.execute("""
        CREATE TABLE workspaces (
            id TEXT PRIMARY KEY,
            directory_revision INTEGER NOT NULL,
            directory_write_token TEXT,
            updated_at TEXT
        )
    """)
    db.execute("""
        CREATE TABLE workspace_directory_year_data (
            workspace_id TEXT NOT NULL,
            fiscal_year TEXT NOT NULL,
            records TEXT NOT NULL,
            revision INTEGER NOT NULL,
            updated_by TEXT,
            updated_at TEXT,
            PRIMARY KEY (workspace_id, fiscal_year)
        )
    """)
    db.execute(
        "INSERT INTO workspaces (id, directory_revision) VALUES ('ws-1', 1)"
    )
    db.execute("""
        INSERT INTO workspace_directory_year_data
        (workspace_id, fiscal_year, records, revision, updated_by, updated_at)
        VALUES ('ws-1', '69', '[{"name":"original"}]', 1, 'owner', 't0')
    """)
    return db


def apply_write(db, expected_revision, token, records_by_year, keep_years, remove_years):
    next_revision = expected_revision + 1
    now = "test-time"
    with db:
        claim = db.execute(
            "UPDATE workspaces SET directory_revision = directory_revision + 1, "
            "directory_write_token = ?, updated_at = ? "
            "WHERE id = ? AND directory_revision = ?",
            (token, now, "ws-1", expected_revision),
        )
        for year, records in records_by_year.items():
            db.execute(
                "INSERT INTO workspace_directory_year_data "
                "(workspace_id, fiscal_year, records, revision, updated_by, updated_at) "
                "SELECT ?, ?, ?, 1, ?, ? WHERE EXISTS ("
                "SELECT 1 FROM workspaces WHERE id = ? AND directory_revision = ? "
                "AND directory_write_token = ?) "
                "ON CONFLICT(workspace_id, fiscal_year) DO UPDATE SET "
                "records = excluded.records, "
                "revision = workspace_directory_year_data.revision + 1, "
                "updated_by = excluded.updated_by, updated_at = excluded.updated_at",
                ("ws-1", year, json.dumps(records), "owner", now,
                 "ws-1", next_revision, token),
            )
        for year in remove_years:
            db.execute(
                "DELETE FROM workspace_directory_year_data "
                "WHERE workspace_id = ? AND fiscal_year = ? AND EXISTS ("
                "SELECT 1 FROM workspaces WHERE id = ? AND directory_revision = ? "
                "AND directory_write_token = ?)",
                ("ws-1", year, "ws-1", next_revision, token),
            )
    return claim.rowcount


def read_year(db, year):
    row = db.execute(
        "SELECT records FROM workspace_directory_year_data "
        "WHERE workspace_id = 'ws-1' AND fiscal_year = ?",
        (year,),
    ).fetchone()
    return json.loads(row[0]) if row else None


def main():
    db = make_db()

    # First client wins its revision and writes a newer snapshot.
    assert apply_write(
        db, 1, "writer-A",
        {"69": [{"name": "saved-by-A"}], "70": [{"name": "new-year-A"}]},
        ["69", "70"], [],
    ) == 1
    assert read_year(db, "69") == [{"name": "saved-by-A"}]
    assert read_year(db, "70") == [{"name": "new-year-A"}]

    # A stale client must neither overwrite existing data nor insert/delete years.
    assert apply_write(
        db, 1, "writer-B",
        {"69": [{"name": "stale-overwrite"}], "71": [{"name": "stale-insert"}]},
        ["69", "71"], ["70"],
    ) == 0
    assert read_year(db, "69") == [{"name": "saved-by-A"}]
    assert read_year(db, "70") == [{"name": "new-year-A"}]
    assert read_year(db, "71") is None
    revision, token = db.execute(
        "SELECT directory_revision, directory_write_token FROM workspaces WHERE id = 'ws-1'"
    ).fetchone()
    assert (revision, token) == (2, "writer-A")

    # A client that reloads revision 2 can then save and remove a year safely.
    assert apply_write(
        db, 2, "writer-C",
        {"69": [{"name": "saved-by-C"}]},
        ["69"], ["70"],
    ) == 1
    assert read_year(db, "69") == [{"name": "saved-by-C"}]
    assert read_year(db, "70") is None
    revision, token = db.execute(
        "SELECT directory_revision, directory_write_token FROM workspaces WHERE id = 'ws-1'"
    ).fetchone()
    assert (revision, token) == (3, "writer-C")

    print("PASS: winning write commits; stale overwrite/insert/delete are blocked; reloaded revision can save.")


if __name__ == "__main__":
    main()
