-- ================================================================
-- PhishSlayer: Threat Hunting Mission Schema
-- ================================================================

-- ── hunt_missions table ─────────────────────────────────────────
CREATE TABLE IF NOT EXISTS public.hunt_missions (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    hypothesis_id TEXT NOT NULL,
    hypothesis_name TEXT NOT NULL,
    status TEXT DEFAULT 'scheduled',
    organization_id TEXT NOT NULL,
    started_at TIMESTAMPTZ,
    completed_at TIMESTAMPTZ,
    alerts_scanned INTEGER DEFAULT 0,
    findings_count INTEGER DEFAULT 0,
    sigma_rule_generated BOOLEAN DEFAULT false,
    created_at TIMESTAMPTZ DEFAULT now()
);

-- ── hunt_findings table ─────────────────────────────────────────
CREATE TABLE IF NOT EXISTS public.hunt_findings (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    mission_id UUID REFERENCES public.hunt_missions(id) ON DELETE CASCADE,
    hypothesis_id TEXT NOT NULL,
    title TEXT NOT NULL,
    description TEXT,
    severity TEXT NOT NULL,
    evidence JSONB DEFAULT '{}'::JSONB,
    affected_assets TEXT[] DEFAULT ARRAY[]::TEXT[],
    mitre_tactic TEXT,
    mitre_technique TEXT,
    recommended_action TEXT,
    case_id UUID REFERENCES public.cases(id),
    created_at TIMESTAMPTZ DEFAULT now()
);

-- ── Enable RLS ───────────────────────────────────────────────────
ALTER TABLE public.hunt_missions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.hunt_findings ENABLE ROW LEVEL SECURITY;

-- ── RLS Policies ─────────────────────────────────────────────────

-- hunt_missions: Authenticated access scoped by org
CREATE POLICY "Authenticated users can view hunt missions" 
    ON public.hunt_missions FOR SELECT 
    USING (auth.jwt() IS NOT NULL);

-- hunt_findings: Authenticated access
CREATE POLICY "Authenticated users can view hunt findings" 
    ON public.hunt_findings FOR SELECT 
    USING (auth.jwt() IS NOT NULL);

-- Service role bypass
CREATE POLICY "Service role full access" ON public.hunt_missions FOR ALL USING (auth.role() = 'service_role');
CREATE POLICY "Service role full access" ON public.hunt_findings FOR ALL USING (auth.role() = 'service_role');

-- ── Indices ──────────────────────────────────────────────────────
CREATE INDEX IF NOT EXISTS idx_hunt_missions_organization_date ON public.hunt_missions(organization_id, started_at DESC);
CREATE INDEX IF NOT EXISTS idx_hunt_findings_mission_id ON public.hunt_findings(mission_id);
CREATE INDEX IF NOT EXISTS idx_hunt_findings_severity ON public.hunt_findings(severity);
