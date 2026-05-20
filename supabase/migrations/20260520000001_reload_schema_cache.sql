-- Ensure show_attending column exists (idempotent) and force PostgREST to
-- reload its schema cache so the column is visible to the API immediately.
ALTER TABLE events ADD COLUMN IF NOT EXISTS show_attending boolean NOT NULL DEFAULT false;

-- Signal PostgREST to reload its in-memory schema cache.
-- This is required when a column is added after the server has started,
-- otherwise API calls that reference the new column return a schema cache error.
NOTIFY pgrst, 'reload schema';
