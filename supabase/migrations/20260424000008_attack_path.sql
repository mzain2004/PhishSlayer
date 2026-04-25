-- ================================================================
-- PhishSlayer: Attack Path Reconstruction Schema
-- ================================================================

-- ── attack_paths table ──────────────────────────────────────────
CREATE TABLE IF NOT EXISTS public.attack_paths (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    root_cause_alert_id UUID REFERENCES public.alerts(id),
    organization_id TEXT NOT NULL,
    nodes JSONB NOT NULL DEFAULT '[]'::JSONB,
    kill_chain_stages JSONB DEFAULT '[]'::JSONB,
    hardening_recommendations JSONB DEFAULT '[]'::JSONB,
    risk_score INTEGER DEFAULT 0,
    target_asset TEXT,
    created_at TIMESTAMPTZ DEFAULT now()
);

-- ... (skipping RLS)

-- ── Indices ──────────────────────────────────────────────────────
CREATE INDEX IF NOT EXISTS idx_attack_paths_organization_id ON public.attack_paths(organization_id);
CREATE INDEX IF NOT EXISTS idx_attack_paths_risk_score ON public.attack_paths(risk_score DESC);
CREATE INDEX IF NOT EXISTS idx_attack_paths_root_alert ON public.attack_paths(root_cause_alert_id);
