-- 0002_roles_and_policies.sql
--
-- Least-privilege database roles plus row level security.
--
-- The application connects as a single login role that holds *no* table
-- privileges of its own. Every query runs inside a transaction that first
-- issues `SET LOCAL ROLE` to one of the three task roles below, so a code
-- path that forgets to select a role fails closed instead of running with
-- full access. See src/lib/db/client.ts and docs/SECURITY.md.
--
--   app_public  public request path: create submissions, read active plans
--   app_auth    sign-in path: verify credentials, manage sessions
--   app_staff   authenticated admin path: read and triage submissions
--
-- Migrations themselves run as the database owner, which is not a member of
-- these roles.

-- ---------------------------------------------------------------------------
-- Task roles
-- ---------------------------------------------------------------------------

DO $outer$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_roles WHERE rolname = 'app_public') THEN
    CREATE ROLE app_public NOLOGIN;
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_roles WHERE rolname = 'app_auth') THEN
    CREATE ROLE app_auth NOLOGIN;
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_roles WHERE rolname = 'app_staff') THEN
    CREATE ROLE app_staff NOLOGIN;
  END IF;
END;
$outer$;

GRANT USAGE ON SCHEMA public TO app_public, app_auth, app_staff;

-- Nothing is granted by default; every privilege below is deliberate.
REVOKE ALL ON ALL TABLES IN SCHEMA public FROM app_public, app_auth, app_staff;

-- ---------------------------------------------------------------------------
-- app_public
-- ---------------------------------------------------------------------------

GRANT INSERT ON service_submissions TO app_public;
GRANT INSERT ON startup_applications TO app_public;
GRANT SELECT ON marketing_plans TO app_public;
GRANT SELECT, INSERT, UPDATE, DELETE ON rate_limit_hits TO app_public;
GRANT INSERT ON email_delivery_logs TO app_public;

-- Deliberately no SELECT grant of any kind. The submission handlers generate
-- the row id and reference code in application code and insert them
-- explicitly, so they never need INSERT ... RETURNING — which under row level
-- security would require a SELECT policy and hand app_public the ability to
-- read back rows. See src/lib/db/submissions.ts.

-- ---------------------------------------------------------------------------
-- app_auth
-- ---------------------------------------------------------------------------

GRANT SELECT (id, email, display_name, role, password_hash, is_active)
  ON profiles TO app_auth;
GRANT UPDATE (last_login_at) ON profiles TO app_auth;
GRANT SELECT, INSERT, UPDATE, DELETE ON admin_sessions TO app_auth;
GRANT SELECT, INSERT, UPDATE, DELETE ON rate_limit_hits TO app_auth;

-- ---------------------------------------------------------------------------
-- app_staff
--
-- Staff may read and triage submissions. Crucially they may NOT update
-- profiles.role, so a compromised staff session cannot escalate privileges.
-- ---------------------------------------------------------------------------

GRANT SELECT, UPDATE ON service_submissions TO app_staff;
GRANT SELECT, UPDATE ON startup_applications TO app_staff;
GRANT SELECT ON marketing_plans TO app_staff;
GRANT SELECT (id, email, display_name, role, is_active, last_login_at, created_at)
  ON profiles TO app_staff;
GRANT SELECT, INSERT ON submission_events TO app_staff;
GRANT SELECT ON email_delivery_logs TO app_staff;
GRANT SELECT, DELETE ON admin_sessions TO app_staff;

-- ---------------------------------------------------------------------------
-- Row level security
-- ---------------------------------------------------------------------------

ALTER TABLE profiles             ENABLE ROW LEVEL SECURITY;
ALTER TABLE admin_sessions       ENABLE ROW LEVEL SECURITY;
ALTER TABLE service_submissions  ENABLE ROW LEVEL SECURITY;
ALTER TABLE startup_applications ENABLE ROW LEVEL SECURITY;
ALTER TABLE marketing_plans      ENABLE ROW LEVEL SECURITY;
ALTER TABLE submission_events    ENABLE ROW LEVEL SECURITY;
ALTER TABLE email_delivery_logs  ENABLE ROW LEVEL SECURITY;
ALTER TABLE rate_limit_hits      ENABLE ROW LEVEL SECURITY;

-- service_submissions ------------------------------------------------------
-- Public callers may create a submission, but only in its initial state and
-- never with staff-only fields populated.
CREATE POLICY service_submissions_public_insert ON service_submissions
  FOR INSERT TO app_public
  WITH CHECK (
    status = 'RECEIVED'
    AND internal_notes IS NULL
    AND assigned_to IS NULL
  );

-- No SELECT policy and no SELECT grant exist for app_public, so a public
-- caller cannot read any submission row under any circumstances.

CREATE POLICY service_submissions_staff_read ON service_submissions
  FOR SELECT TO app_staff USING (true);

CREATE POLICY service_submissions_staff_update ON service_submissions
  FOR UPDATE TO app_staff USING (true) WITH CHECK (true);

-- startup_applications -----------------------------------------------------
CREATE POLICY startup_applications_public_insert ON startup_applications
  FOR INSERT TO app_public
  WITH CHECK (
    status = 'RECEIVED'
    AND internal_notes IS NULL
    AND reviewed_by IS NULL
    AND reviewed_at IS NULL
  );

CREATE POLICY startup_applications_staff_read ON startup_applications
  FOR SELECT TO app_staff USING (true);

CREATE POLICY startup_applications_staff_update ON startup_applications
  FOR UPDATE TO app_staff USING (true) WITH CHECK (true);

-- marketing_plans ----------------------------------------------------------
-- Public pages only ever see active plans.
CREATE POLICY marketing_plans_public_read ON marketing_plans
  FOR SELECT TO app_public USING (is_active);

CREATE POLICY marketing_plans_staff_read ON marketing_plans
  FOR SELECT TO app_staff USING (true);

-- profiles -----------------------------------------------------------------
CREATE POLICY profiles_auth_read ON profiles
  FOR SELECT TO app_auth USING (is_active);

CREATE POLICY profiles_auth_touch_login ON profiles
  FOR UPDATE TO app_auth USING (is_active) WITH CHECK (is_active);

CREATE POLICY profiles_staff_read ON profiles
  FOR SELECT TO app_staff USING (true);

-- admin_sessions -----------------------------------------------------------
CREATE POLICY admin_sessions_auth_all ON admin_sessions
  FOR ALL TO app_auth USING (true) WITH CHECK (true);

CREATE POLICY admin_sessions_staff_revoke ON admin_sessions
  FOR SELECT TO app_staff USING (true);

CREATE POLICY admin_sessions_staff_delete ON admin_sessions
  FOR DELETE TO app_staff USING (true);

-- submission_events --------------------------------------------------------
CREATE POLICY submission_events_staff_read ON submission_events
  FOR SELECT TO app_staff USING (true);

CREATE POLICY submission_events_staff_insert ON submission_events
  FOR INSERT TO app_staff WITH CHECK (true);

-- email_delivery_logs ------------------------------------------------------
CREATE POLICY email_delivery_logs_public_insert ON email_delivery_logs
  FOR INSERT TO app_public WITH CHECK (true);

CREATE POLICY email_delivery_logs_staff_read ON email_delivery_logs
  FOR SELECT TO app_staff USING (true);

-- rate_limit_hits ----------------------------------------------------------
CREATE POLICY rate_limit_hits_public_all ON rate_limit_hits
  FOR ALL TO app_public USING (true) WITH CHECK (true);

CREATE POLICY rate_limit_hits_auth_all ON rate_limit_hits
  FOR ALL TO app_auth USING (true) WITH CHECK (true);
