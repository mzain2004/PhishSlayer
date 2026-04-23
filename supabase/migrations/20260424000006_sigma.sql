-- ================================================================
-- PhishSlayer: Sigma Rule Management Schema
-- ================================================================

-- ── sigma_rules table updates ───────────────────────────────────
-- If table doesn't exist, create it. If it does, add columns.
CREATE TABLE IF NOT EXISTS public.sigma_rules (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    title TEXT NOT NULL,
    description TEXT,
    status TEXT DEFAULT 'experimental',
    level TEXT DEFAULT 'medium',
    logsource JSONB,
    detection JSONB,
    falsepositives TEXT[] DEFAULT ARRAY[]::TEXT[],
    tags TEXT[] DEFAULT ARRAY[]::TEXT[],
    author TEXT DEFAULT 'PhishSlayer',
    created_at TIMESTAMPTZ DEFAULT now(),
    updated_at TIMESTAMPTZ DEFAULT now()
);

DO $$
BEGIN
    -- Add columns if they don't exist
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'sigma_rules' AND column_name = 'hunt_finding_id') THEN
        ALTER TABLE public.sigma_rules ADD COLUMN hunt_finding_id UUID;
    END IF;
    
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'sigma_rules' AND column_name = 'yaml_content') THEN
        ALTER TABLE public.sigma_rules ADD COLUMN yaml_content TEXT;
    END IF;

    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'sigma_rules' AND column_name = 'tested') THEN
        ALTER TABLE public.sigma_rules ADD COLUMN tested BOOLEAN DEFAULT false;
    END IF;

    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'sigma_rules' AND column_name = 'deployed') THEN
        ALTER TABLE public.sigma_rules ADD COLUMN deployed BOOLEAN DEFAULT false;
    END IF;

    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'sigma_rules' AND column_name = 'wazuh_rule_id') THEN
        ALTER TABLE public.sigma_rules ADD COLUMN wazuh_rule_id TEXT;
    END IF;

    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'sigma_rules' AND column_name = 'test_results') THEN
        ALTER TABLE public.sigma_rules ADD COLUMN test_results JSONB;
    END IF;

    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'sigma_rules' AND column_name = 'author') THEN
        ALTER TABLE public.sigma_rules ADD COLUMN author TEXT DEFAULT 'PhishSlayer';
    END IF;
END $$;

-- ── Enable RLS ───────────────────────────────────────────────────
ALTER TABLE public.sigma_rules ENABLE ROW LEVEL SECURITY;

-- ── RLS Policies ─────────────────────────────────────────────────

-- sigma_rules: Authenticated access
CREATE POLICY "Authenticated users can view sigma rules" 
    ON public.sigma_rules FOR SELECT 
    USING (auth.jwt() IS NOT NULL);

-- Service role bypass
CREATE POLICY "Service role full access" ON public.sigma_rules FOR ALL USING (auth.role() = 'service_role');

-- ── Indices ──────────────────────────────────────────────────────
CREATE INDEX IF NOT EXISTS idx_sigma_rules_deployed ON public.sigma_rules(deployed);
CREATE INDEX IF NOT EXISTS idx_sigma_rules_finding_id ON public.sigma_rules(hunt_finding_id);
