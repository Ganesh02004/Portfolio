-- 0001_initial_schema.sql
-- Core schema for the Business Services Platform.
-- All timestamps are stored in UTC. Primary keys are UUIDs.

CREATE EXTENSION IF NOT EXISTS pgcrypto;

-- ---------------------------------------------------------------------------
-- Enumerated domains
-- ---------------------------------------------------------------------------

CREATE TYPE staff_role AS ENUM ('ADMIN', 'STAFF');

CREATE TYPE submission_type AS ENUM (
  'TRAINING',
  'MARKETING',
  'DIGITALIZATION',
  'CONTACT'
);

CREATE TYPE submission_status AS ENUM (
  'RECEIVED',
  'UNDER_REVIEW',
  'CONTACTED',
  'NEEDS_INFORMATION',
  'CLOSED'
);

CREATE TYPE startup_status AS ENUM (
  'RECEIVED',
  'UNDER_REVIEW',
  'SHORTLISTED',
  'NOT_SELECTED',
  'NEEDS_INFORMATION',
  'CONTACTED',
  'CLOSED'
);

CREATE TYPE billing_model AS ENUM ('ONE_TIME', 'RECURRING');

CREATE TYPE email_delivery_status AS ENUM ('SENT', 'FAILED');

-- ---------------------------------------------------------------------------
-- Shared helpers
-- ---------------------------------------------------------------------------

CREATE OR REPLACE FUNCTION set_updated_at() RETURNS TRIGGER AS $fn$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$fn$ LANGUAGE plpgsql;

-- ---------------------------------------------------------------------------
-- profiles: staff accounts. Credentials live here because this deployment
-- self-hosts authentication rather than delegating to a managed auth provider.
-- Role changes are restricted by policy in 0002; see docs/SECURITY.md.
-- ---------------------------------------------------------------------------

CREATE TABLE profiles (
  id             UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  email          TEXT NOT NULL CHECK (position('@' IN email) > 1),
  display_name   TEXT NOT NULL CHECK (length(btrim(display_name)) BETWEEN 1 AND 120),
  role           staff_role NOT NULL DEFAULT 'STAFF',
  password_hash  TEXT NOT NULL,
  is_active      BOOLEAN NOT NULL DEFAULT TRUE,
  last_login_at  TIMESTAMPTZ NULL,
  created_at     TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at     TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE UNIQUE INDEX profiles_email_unique_idx ON profiles (lower(email));

CREATE TRIGGER profiles_set_updated_at
  BEFORE UPDATE ON profiles
  FOR EACH ROW EXECUTE FUNCTION set_updated_at();

-- ---------------------------------------------------------------------------
-- admin_sessions: server-side session records. Only a SHA-256 hash of the
-- session token is stored, so database access alone does not yield a usable
-- session cookie.
-- ---------------------------------------------------------------------------

CREATE TABLE admin_sessions (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  profile_id      UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  token_hash      TEXT NOT NULL UNIQUE,
  expires_at      TIMESTAMPTZ NOT NULL,
  created_at      TIMESTAMPTZ NOT NULL DEFAULT now(),
  last_seen_at    TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX admin_sessions_profile_id_idx ON admin_sessions (profile_id);
CREATE INDEX admin_sessions_expires_at_idx ON admin_sessions (expires_at);

-- ---------------------------------------------------------------------------
-- service_submissions: contact, training, marketing and digitalization
-- inquiries share one table because they share one review workflow.
-- ---------------------------------------------------------------------------

CREATE TABLE service_submissions (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  reference_code  TEXT NOT NULL UNIQUE,
  submission_type submission_type NOT NULL,
  status          submission_status NOT NULL DEFAULT 'RECEIVED',
  full_name       TEXT NOT NULL CHECK (length(btrim(full_name)) BETWEEN 2 AND 120),
  email           TEXT NOT NULL CHECK (position('@' IN email) > 1),
  phone           TEXT NULL,
  business_name   TEXT NULL,
  selected_option TEXT NULL,
  message         TEXT NULL,
  source_page     TEXT NULL,
  consent_at      TIMESTAMPTZ NOT NULL,
  assigned_to     UUID NULL REFERENCES profiles(id) ON DELETE SET NULL,
  internal_notes  TEXT NULL,
  created_at      TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at      TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX service_submissions_created_at_idx ON service_submissions (created_at DESC);
CREATE INDEX service_submissions_status_idx ON service_submissions (status);
CREATE INDEX service_submissions_type_idx ON service_submissions (submission_type);
CREATE INDEX service_submissions_email_idx ON service_submissions (lower(email));

CREATE TRIGGER service_submissions_set_updated_at
  BEFORE UPDATE ON service_submissions
  FOR EACH ROW EXECUTE FUNCTION set_updated_at();

-- ---------------------------------------------------------------------------
-- startup_applications
-- presentation_object_key holds a private object-store key, never a URL.
-- ---------------------------------------------------------------------------

CREATE TABLE startup_applications (
  id                       UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  reference_code           TEXT NOT NULL UNIQUE,
  status                   startup_status NOT NULL DEFAULT 'RECEIVED',
  applicant_name           TEXT NOT NULL CHECK (length(btrim(applicant_name)) BETWEEN 2 AND 120),
  email                    TEXT NOT NULL CHECK (position('@' IN email) > 1),
  phone                    TEXT NULL,
  startup_name             TEXT NOT NULL,
  idea_title               TEXT NOT NULL,
  idea_summary             TEXT NOT NULL,
  problem_statement        TEXT NULL,
  target_customer          TEXT NULL,
  referral_source          TEXT NULL,
  pitch_video_url          TEXT NOT NULL,
  presentation_object_key  TEXT NOT NULL UNIQUE,
  presentation_filename    TEXT NOT NULL,
  presentation_size_bytes  BIGINT NOT NULL CHECK (presentation_size_bytes > 0),
  presentation_mime_type   TEXT NOT NULL,
  consent_at               TIMESTAMPTZ NOT NULL,
  internal_notes           TEXT NULL,
  reviewed_by              UUID NULL REFERENCES profiles(id) ON DELETE SET NULL,
  reviewed_at              TIMESTAMPTZ NULL,
  created_at               TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at               TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX startup_applications_created_at_idx ON startup_applications (created_at DESC);
CREATE INDEX startup_applications_status_idx ON startup_applications (status);
CREATE INDEX startup_applications_email_idx ON startup_applications (lower(email));

CREATE TRIGGER startup_applications_set_updated_at
  BEFORE UPDATE ON startup_applications
  FOR EACH ROW EXECUTE FUNCTION set_updated_at();

-- ---------------------------------------------------------------------------
-- marketing_plans: editable content. Money is stored in minor units only.
-- is_pricing_confirmed gates whether a price may be shown publicly.
-- ---------------------------------------------------------------------------

CREATE TABLE marketing_plans (
  id                   UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name                 TEXT NOT NULL,
  slug                 TEXT NOT NULL UNIQUE,
  billing_model        billing_model NOT NULL,
  duration_months      INTEGER NULL CHECK (duration_months IS NULL OR duration_months > 0),
  price_minor_units    BIGINT NULL CHECK (price_minor_units IS NULL OR price_minor_units >= 0),
  currency             CHAR(3) NOT NULL DEFAULT 'INR',
  summary              TEXT NOT NULL,
  target_business      TEXT NULL,
  cta_label            TEXT NOT NULL DEFAULT 'Request a marketing consultation',
  deliverables         JSONB NOT NULL DEFAULT '[]'::jsonb,
  exclusions           JSONB NOT NULL DEFAULT '[]'::jsonb,
  is_active            BOOLEAN NOT NULL DEFAULT TRUE,
  is_pricing_confirmed BOOLEAN NOT NULL DEFAULT FALSE,
  display_order        INTEGER NOT NULL DEFAULT 0,
  created_at           TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at           TIMESTAMPTZ NOT NULL DEFAULT now(),
  CONSTRAINT marketing_plans_deliverables_is_array CHECK (jsonb_typeof(deliverables) = 'array'),
  CONSTRAINT marketing_plans_exclusions_is_array CHECK (jsonb_typeof(exclusions) = 'array'),
  CONSTRAINT marketing_plans_one_time_has_no_duration
    CHECK (billing_model <> 'ONE_TIME' OR duration_months IS NULL),
  CONSTRAINT marketing_plans_confirmed_pricing_has_price
    CHECK (is_pricing_confirmed = FALSE OR price_minor_units IS NOT NULL)
);

CREATE INDEX marketing_plans_active_order_idx ON marketing_plans (is_active, display_order);

CREATE TRIGGER marketing_plans_set_updated_at
  BEFORE UPDATE ON marketing_plans
  FOR EACH ROW EXECUTE FUNCTION set_updated_at();

-- ---------------------------------------------------------------------------
-- submission_events: audit trail for status changes and note edits.
-- ---------------------------------------------------------------------------

CREATE TABLE submission_events (
  id               UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  subject_table    TEXT NOT NULL
    CHECK (subject_table IN ('service_submissions', 'startup_applications')),
  subject_id       UUID NOT NULL,
  actor_profile_id UUID NULL REFERENCES profiles(id) ON DELETE SET NULL,
  event_type       TEXT NOT NULL,
  from_status      TEXT NULL,
  to_status        TEXT NULL,
  detail           TEXT NULL,
  created_at       TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX submission_events_subject_idx
  ON submission_events (subject_table, subject_id, created_at DESC);

-- ---------------------------------------------------------------------------
-- email_delivery_logs: delivery outcome only. Message bodies are never stored.
-- recipient_hint is a masked address, not the full one.
-- ---------------------------------------------------------------------------

CREATE TABLE email_delivery_logs (
  id             UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  subject_table  TEXT NULL,
  subject_id     UUID NULL,
  template       TEXT NOT NULL,
  recipient_hint TEXT NOT NULL,
  status         email_delivery_status NOT NULL,
  error_message  TEXT NULL,
  attempts       INTEGER NOT NULL DEFAULT 1,
  created_at     TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX email_delivery_logs_created_at_idx ON email_delivery_logs (created_at DESC);
CREATE INDEX email_delivery_logs_status_idx ON email_delivery_logs (status);

-- ---------------------------------------------------------------------------
-- rate_limit_hits: fixed-window counters kept in Postgres so the first
-- release needs no additional infrastructure.
-- ---------------------------------------------------------------------------

CREATE TABLE rate_limit_hits (
  bucket_key   TEXT NOT NULL,
  window_start TIMESTAMPTZ NOT NULL,
  hit_count    INTEGER NOT NULL DEFAULT 1,
  PRIMARY KEY (bucket_key, window_start)
);

CREATE INDEX rate_limit_hits_window_start_idx ON rate_limit_hits (window_start);
