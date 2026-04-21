-- ================================================================
-- PhishSlayer: Clerk Auth → Supabase RLS Migration
-- ================================================================
-- Run this in Supabase Dashboard → SQL Editor
-- 
-- After migration to Clerk:
-- - auth.uid() NO LONGER WORKS (Supabase Auth is not used)
-- - Use (auth.jwt() ->> 'sub') to get Clerk user ID
-- - Requires Clerk "supabase" JWT template to be configured
-- ================================================================

-- ── IMPORTANT: First set up your JWT secret in Supabase ──────────
-- In Supabase Dashboard → Settings → Auth → JWT Settings
-- Set "JWT Secret" to match your Clerk JWT template signing key
-- ================================================================

-- ── profiles table ──────────────────────────────────────────────
DROP POLICY IF EXISTS "Users can view their own profile" ON profiles;
DROP POLICY IF EXISTS "Users can update their own profile" ON profiles;

CREATE POLICY "Users can view their own profile"
  ON profiles FOR SELECT
  USING ((auth.jwt() ->> 'sub') = id::text);

CREATE POLICY "Users can update their own profile"
  ON profiles FOR UPDATE
  USING ((auth.jwt() ->> 'sub') = id::text);

-- ── scans table ─────────────────────────────────────────────────
DROP POLICY IF EXISTS "Users can view their own scans" ON scans;
DROP POLICY IF EXISTS "Users can insert scans" ON scans;

CREATE POLICY "Users can view their own scans"
  ON scans FOR SELECT
  USING ((auth.jwt() ->> 'sub') = user_id::text);

CREATE POLICY "Users can insert scans"
  ON scans FOR INSERT
  WITH CHECK ((auth.jwt() ->> 'sub') = user_id::text);

-- ── incidents table ──────────────────────────────────────────────
DROP POLICY IF EXISTS "Authenticated users can view incidents" ON incidents;
DROP POLICY IF EXISTS "Authenticated users can manage incidents" ON incidents;

CREATE POLICY "Authenticated users can view incidents"
  ON incidents FOR SELECT
  USING (auth.jwt() IS NOT NULL);

CREATE POLICY "Authenticated users can manage incidents"
  ON incidents FOR ALL
  USING (auth.jwt() IS NOT NULL)
  WITH CHECK (auth.jwt() IS NOT NULL);

-- ── audit_logs table ─────────────────────────────────────────────
DROP POLICY IF EXISTS "Users can view their own audit logs" ON audit_logs;

CREATE POLICY "Users can view their own audit logs"
  ON audit_logs FOR SELECT
  USING ((auth.jwt() ->> 'sub') = user_id::text);

-- ── whitelist table ──────────────────────────────────────────────
DROP POLICY IF EXISTS "Authenticated users can manage whitelist" ON whitelist;

CREATE POLICY "Authenticated users can manage whitelist"
  ON whitelist FOR ALL
  USING (auth.jwt() IS NOT NULL)
  WITH CHECK (auth.jwt() IS NOT NULL);

-- ── proprietary_intel table ──────────────────────────────────────
DROP POLICY IF EXISTS "Authenticated users can manage intel" ON proprietary_intel;

CREATE POLICY "Authenticated users can manage intel"
  ON proprietary_intel FOR ALL
  USING (auth.jwt() IS NOT NULL)
  WITH CHECK (auth.jwt() IS NOT NULL);

-- ── support_tickets table ────────────────────────────────────────
DROP POLICY IF EXISTS "Users can manage their own tickets" ON support_tickets;

CREATE POLICY "Users can manage their own tickets"
  ON support_tickets FOR ALL
  USING ((auth.jwt() ->> 'sub') = user_id::text)
  WITH CHECK ((auth.jwt() ->> 'sub') = user_id::text);

-- ── endpoint_events table ────────────────────────────────────────
DROP POLICY IF EXISTS "Users can view their own endpoint events" ON endpoint_events;

CREATE POLICY "Users can view their own endpoint events"
  ON endpoint_events FOR SELECT
  USING ((auth.jwt() ->> 'sub') = user_id::text);

-- ── agent_reasoning, hunt_findings, escalations, audit_logs ─────
-- These are read by authenticated users; scope as needed

DROP POLICY IF EXISTS "Authenticated users can view agent data" ON agent_reasoning;
CREATE POLICY "Authenticated users can view agent data"
  ON agent_reasoning FOR SELECT
  USING (auth.jwt() IS NOT NULL);

DROP POLICY IF EXISTS "Authenticated users can view hunt findings" ON hunt_findings;
CREATE POLICY "Authenticated users can view hunt findings"
  ON hunt_findings FOR SELECT
  USING (auth.jwt() IS NOT NULL);

DROP POLICY IF EXISTS "Authenticated users can view escalations" ON escalations;
CREATE POLICY "Authenticated users can view escalations"
  ON escalations FOR SELECT
  USING (auth.jwt() IS NOT NULL);

-- ================================================================
-- END OF MIGRATION
-- ================================================================
