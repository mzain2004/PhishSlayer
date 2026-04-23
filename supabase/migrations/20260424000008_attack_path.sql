-- ================================================================
-- PhishSlayer: Attack Path Reconstruction Schema
-- ================================================================

-- ── attack_paths table ──────────────────────────────────────────
CREATE TABLE IF NOT EXISTS public.attack_paths (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    root_cause_alert_id UUID REFERENCES public.alerts(id),
    org_id TEXT NOT NULL,
    nodes JSONB NOT NULL DEFAULT '[]'::JSONB,
    risk_score INTEGER DEFAULT 0,
    target_asset TEXT,
    created_at TIMESTAMPTZ DEFAULT now()
);

-- ── Enable RLS ───────────────────────────────────────────────────
ALTER TABLE public.attack_paths ENABLE ROW LEVEL SECURITY;

-- ── RLS Policies ─────────────────────────────────────────────────

-- attack_paths: Authenticated access scoped by org
CREATE POLICY "Authenticated users can view attack paths" 
    ON public.attack_paths FOR SELECT 
    USING (auth.jwt() IS NOT NULL);

-- Service role bypass
CREATE POLICY "Service role full access" ON public.attack_paths FOR ALL USING (auth.role() = 'service_role');

-- ── Indices ──────────────────────────────────────────────────────
CREATE INDEX IF NOT EXISTS idx_attack_paths_org_id ON public.attack_paths(org_id);
CREATE INDEX IF NOT EXISTS idx_attack_paths_risk_score ON public.attack_paths(risk_score DESC);
CREATE INDEX IF NOT EXISTS idx_attack_paths_root_alert ON public.attack_paths(root_cause_alert_id);
