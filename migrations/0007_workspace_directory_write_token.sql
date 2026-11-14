-- Bind every statement in a directory save batch to the exact
-- compare-and-swap winner. This prevents a losing stale batch from passing
-- a revision-only gate after another request increments the revision.
ALTER TABLE workspaces ADD COLUMN directory_write_token TEXT;
