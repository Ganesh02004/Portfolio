-- 0003_presentations_in_database.sql
--
-- Moves uploaded startup presentations into the database.
--
-- Previously the bytes lived in an object store or on a mounted volume, which
-- meant the platform needed a second stateful resource and the write path was
-- a two-phase commit: upload the file, insert the row, and delete the object
-- again if the insert failed. Keeping the bytes in the same transaction as the
-- row removes that failure mode entirely — a presentation and its application
-- now commit or roll back together, so an orphaned file cannot exist.
--
-- Content lives in its own table rather than a column on startup_applications,
-- so the list and detail queries never pull several megabytes they do not need.

CREATE TABLE startup_presentations (
  application_id UUID PRIMARY KEY
    REFERENCES startup_applications(id) ON DELETE CASCADE,
  content        BYTEA NOT NULL,
  created_at     TIMESTAMPTZ NOT NULL DEFAULT now(),
  CONSTRAINT startup_presentations_not_empty CHECK (octet_length(content) > 0)
);

-- The object key described a location in a store that no longer exists.
-- Filename, size and MIME type stay on startup_applications: they are metadata
-- staff read, not storage addressing.
ALTER TABLE startup_applications DROP COLUMN presentation_object_key;

-- ---------------------------------------------------------------------------
-- Privileges, matching the pattern in 0002.
--
-- app_public may insert a presentation alongside the application it belongs to
-- and may never read one back. app_staff may read one in order to serve a
-- download, and may never alter or delete it.
-- ---------------------------------------------------------------------------

GRANT INSERT ON startup_presentations TO app_public;
GRANT SELECT ON startup_presentations TO app_staff;

ALTER TABLE startup_presentations ENABLE ROW LEVEL SECURITY;

CREATE POLICY startup_presentations_public_insert ON startup_presentations
  FOR INSERT TO app_public WITH CHECK (true);

CREATE POLICY startup_presentations_staff_read ON startup_presentations
  FOR SELECT TO app_staff USING (true);
