-- ================================================================
-- PhishSlayer: Org Isolation RLS — TEMPLATE / REVIEW BEFORE APPLY
-- ================================================================
-- The existing 20260421_clerk_rls_migration.sql migration uses
-- user-scoped policies (auth.jwt() ->> 'sub') on some tables and
-- "any authenticated user" (auth.jwt() IS NOT NULL) on others.
-- The "any authenticated user" rules allow Org A to read Org B's
-- rows — this template tightens that to org-scoped policies.
--
-- ⚠️  DO NOT apply this as-is. For each table below:
--    1. Confirm the org column name (org_id vs organization_id).
--    2. Confirm the Clerk JWT template emits `org_id` claim.
--    3. Drop existing wide-open policies, then apply org-scoped.
--    4. Run an isolation test with two orgs before committing.
--
-- Cast strategy: Clerk org_id is a string ("org_xxxxx"). Tables
-- with text org columns compare directly; tables with uuid columns
-- need ::text on the column side.
-- ================================================================

-- Helper: extract the Clerk org_id claim from the JWT.
-- Wrap as a SECURITY DEFINER function so policies remain readable.
CREATE OR REPLACE FUNCTION public.current_org_id()
  RETURNS text
  LANGUAGE sql
  STABLE
  AS $$
    SELECT auth.jwt() ->> 'org_id';
  $$;

-- ────────────────────────────────────────────────────────────────
-- Pattern: replace per-table.
-- Tables flagged by the audit as needing org_isolation:
--   alerts, incidents, iocs, reports, agents, halo_proposals,
--   org_integrations, tool_call_logs, platform_logs
-- ────────────────────────────────────────────────────────────────

-- Example for `alerts` (assumes column `org_id text NOT NULL`):
ALTER TABLE alerts ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "alerts_org_isolation" ON alerts;
CREATE POLICY "alerts_org_isolation"
  ON alerts
  FOR ALL
  USING (org_id = public.current_org_id())
  WITH CHECK (org_id = public.current_org_id());

-- Example for `incidents` (replaces the wide-open policy from
-- the Clerk migration that used `auth.jwt() IS NOT NULL`):
ALTER TABLE incidents ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Authenticated users can view incidents" ON incidents;
DROP POLICY IF EXISTS "Authenticated users can manage incidents" ON incidents;
DROP POLICY IF EXISTS "incidents_org_isolation" ON incidents;
CREATE POLICY "incidents_org_isolation"
  ON incidents
  FOR ALL
  USING (org_id = public.current_org_id())
  WITH CHECK (org_id = public.current_org_id());

-- Example for `org_integrations` (encrypted_key MUST never leak
-- cross-org; this policy plus column-level grants is the belt-
-- and-braces approach):
ALTER TABLE org_integrations ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "org_integrations_org_isolation" ON org_integrations;
CREATE POLICY "org_integrations_org_isolation"
  ON org_integrations
  FOR ALL
  USING (org_id = public.current_org_id())
  WITH CHECK (org_id = public.current_org_id());

-- Repeat the same template for: iocs, reports, agents,
-- halo_proposals, tool_call_logs, platform_logs.
-- For each:
--   ALTER TABLE <t> ENABLE ROW LEVEL SECURITY;
--   DROP POLICY IF EXISTS "<t>_org_isolation" ON <t>;
--   CREATE POLICY "<t>_org_isolation"
--     ON <t>
--     FOR ALL
--     USING (org_id = public.current_org_id())
--     WITH CHECK (org_id = public.current_org_id());

-- ────────────────────────────────────────────────────────────────
-- Isolation test (run after applying):
--
--   SET request.jwt.claim.org_id TO 'org_A';
--   SELECT count(*) FROM alerts;  -- only A's rows
--   SET request.jwt.claim.org_id TO 'org_B';
--   SELECT count(*) FROM alerts;  -- only B's rows
--   RESET request.jwt.claim.org_id;
-- ────────────────────────────────────────────────────────────────
