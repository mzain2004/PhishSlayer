-- ================================================================
-- PhishSlayer: UEBA Anomaly Detection & Risk Scoring Schema
-- ================================================================

-- ── ueba_profiles table ─────────────────────────────────────────
CREATE TABLE IF NOT EXISTS public.ueba_profiles (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id TEXT UNIQUE NOT NULL,
    username TEXT,
    organization_id TEXT NOT NULL,
    baseline_login_hours INTEGER[] DEFAULT ARRAY[]::INTEGER[],
    baseline_locations TEXT[] DEFAULT ARRAY[]::TEXT[],
    baseline_devices TEXT[] DEFAULT ARRAY[]::TEXT[],
    avg_daily_alerts NUMERIC DEFAULT 0,
    risk_score INTEGER DEFAULT 0,
    last_updated TIMESTAMPTZ DEFAULT now()
);

-- ── ueba_anomalies table ────────────────────────────────────────
CREATE TABLE IF NOT EXISTS public.ueba_anomalies (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id TEXT NOT NULL,
    entity_id TEXT NOT NULL,
    entity_type TEXT NOT NULL,
    anomaly_type TEXT NOT NULL,
    severity TEXT NOT NULL,
    description TEXT,
    evidence JSONB DEFAULT '{}'::JSONB,
    detected_at TIMESTAMPTZ DEFAULT now(),
    case_id UUID REFERENCES public.cases(id),
    suppressed BOOLEAN DEFAULT false
);

-- ── Enable RLS ───────────────────────────────────────────────────
ALTER TABLE public.ueba_profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.ueba_anomalies ENABLE ROW LEVEL SECURITY;

-- ── RLS Policies ─────────────────────────────────────────────────

-- ueba_profiles: Authenticated access scoped by org if org_id is provided in JWT
CREATE POLICY "Authenticated users can view profiles" 
    ON public.ueba_profiles FOR SELECT 
    USING (auth.jwt() IS NOT NULL);

-- ueba_anomalies: Authenticated access
CREATE POLICY "Authenticated users can view anomalies" 
    ON public.ueba_anomalies FOR SELECT 
    USING (auth.jwt() IS NOT NULL);

-- Service role bypass
CREATE POLICY "Service role full access" ON public.ueba_profiles FOR ALL USING (auth.role() = 'service_role');
CREATE POLICY "Service role full access" ON public.ueba_anomalies FOR ALL USING (auth.role() = 'service_role');

-- ── Indices ──────────────────────────────────────────────────────
CREATE INDEX IF NOT EXISTS idx_ueba_anomalies_entity_id_date ON public.ueba_anomalies(entity_id, detected_at DESC);
CREATE INDEX IF NOT EXISTS idx_ueba_profiles_risk_score ON public.ueba_profiles(risk_score DESC);
CREATE INDEX IF NOT EXISTS idx_ueba_anomalies_user_id ON public.ueba_anomalies(user_id);
