-- A single workspace-level compare-and-swap revision protects the complete
-- directory snapshot, including fiscal-year additions and removals.
ALTER TABLE workspaces
  ADD COLUMN directory_revision INTEGER NOT NULL DEFAULT 1
  CHECK (directory_revision > 0);
