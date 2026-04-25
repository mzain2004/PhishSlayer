-- ================================================================
-- PhishSlayer: Case Management Schema
-- ================================================================

-- ── cases table ──────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS public.cases (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    organization_id TEXT,
    user_id TEXT DEFAULT (auth.jwt() ->> 'sub'),
    title TEXT NOT NULL,
    severity TEXT CHECK (severity IN ('p1', 'p2', 'p3', 'p4')),
    status TEXT CHECK (status IN ('open', 'investigating', 'contained', 'closed')),
    alert_type TEXT,
    source_ip TEXT,
    affected_asset TEXT,
    mitre_tactic TEXT,
    mitre_technique TEXT,
    sla_deadline TIMESTAMPTZ,
    created_at TIMESTAMPTZ DEFAULT now(),
    updated_at TIMESTAMPTZ DEFAULT now(),
    closed_at TIMESTAMPTZ
);

-- ── case_timeline table ──────────────────────────────────────────
CREATE TABLE IF NOT EXISTS public.case_timeline (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    case_id UUID REFERENCES public.cases(id) ON DELETE CASCADE,
    action TEXT NOT NULL,
    actor TEXT,
    details JSONB DEFAULT '{}'::jsonb,
    created_at TIMESTAMPTZ DEFAULT now()
);

-- ── case_evidence table ──────────────────────────────────────────
CREATE TABLE IF NOT EXISTS public.case_evidence (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    case_id UUID REFERENCES public.cases(id) ON DELETE CASCADE,
    evidence_type TEXT,
    content JSONB DEFAULT '{}'::jsonb,
    created_at TIMESTAMPTZ DEFAULT now()
);

-- ── ioc_store table ──────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS public.ioc_store (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    case_id UUID REFERENCES public.cases(id) ON DELETE CASCADE,
    ioc_type TEXT,
    value TEXT,
    enrichment JSONB DEFAULT '{}'::jsonb,
    malicious BOOLEAN DEFAULT false,
    confidence_score INTEGER DEFAULT 0,
    first_seen TIMESTAMPTZ,
    last_seen TIMESTAMPTZ
);

-- ── Enable RLS ───────────────────────────────────────────────────
ALTER TABLE public.cases ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.case_timeline ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.case_evidence ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.ioc_store ENABLE ROW LEVEL SECURITY;

-- ── RLS Policies ─────────────────────────────────────────────────

-- cases: scoped by user_id (Clerk sub)
CREATE POLICY "Users can view their own cases" 
    ON public.cases FOR SELECT 
    USING ((auth.jwt() ->> 'sub') = user_id);

CREATE POLICY "Users can insert their own cases" 
    ON public.cases FOR INSERT 
    WITH CHECK ((auth.jwt() ->> 'sub') = user_id);

CREATE POLICY "Users can update their own cases" 
    ON public.cases FOR UPDATE 
    USING ((auth.jwt() ->> 'sub') = user_id);

-- case_timeline: scoped by parent case access
CREATE POLICY "Users can view case timeline" 
    ON public.case_timeline FOR SELECT 
    USING (EXISTS (
        SELECT 1 FROM public.cases 
        WHERE id = case_timeline.case_id AND user_id = (auth.jwt() ->> 'sub')
    ));

CREATE POLICY "Users can insert case timeline" 
    ON public.case_timeline FOR INSERT 
    WITH CHECK (EXISTS (
        SELECT 1 FROM public.cases 
        WHERE id = case_id AND user_id = (auth.jwt() ->> 'sub')
    ));

-- case_evidence: scoped by parent case access
CREATE POLICY "Users can view case evidence" 
    ON public.case_evidence FOR SELECT 
    USING (EXISTS (
        SELECT 1 FROM public.cases 
        WHERE id = case_evidence.case_id AND user_id = (auth.jwt() ->> 'sub')
    ));

CREATE POLICY "Users can insert case evidence" 
    ON public.case_evidence FOR INSERT 
    WITH CHECK (EXISTS (
        SELECT 1 FROM public.cases 
        WHERE id = case_id AND user_id = (auth.jwt() ->> 'sub')
    ));

-- ioc_store: scoped by parent case access
CREATE POLICY "Users can view iocs" 
    ON public.ioc_store FOR SELECT 
    USING (EXISTS (
        SELECT 1 FROM public.cases 
        WHERE id = ioc_store.case_id AND user_id = (auth.jwt() ->> 'sub')
    ));

CREATE POLICY "Users can insert iocs" 
    ON public.ioc_store FOR INSERT 
    WITH CHECK (EXISTS (
        SELECT 1 FROM public.cases 
        WHERE id = case_id AND user_id = (auth.jwt() ->> 'sub')
    ));

-- Service role bypass
CREATE POLICY "Service role full access" ON public.cases FOR ALL USING (auth.role() = 'service_role');
CREATE POLICY "Service role full access" ON public.case_timeline FOR ALL USING (auth.role() = 'service_role');
CREATE POLICY "Service role full access" ON public.case_evidence FOR ALL USING (auth.role() = 'service_role');
CREATE POLICY "Service role full access" ON public.ioc_store FOR ALL USING (auth.role() = 'service_role');

-- ── Indices ──────────────────────────────────────────────────────
CREATE INDEX IF NOT EXISTS idx_cases_organization_id ON public.cases(organization_id);
CREATE INDEX IF NOT EXISTS idx_cases_user_id ON public.cases(user_id);
CREATE INDEX IF NOT EXISTS idx_case_timeline_case_id ON public.case_timeline(case_id);
CREATE INDEX IF NOT EXISTS idx_case_evidence_case_id ON public.case_evidence(case_id);
CREATE INDEX IF NOT EXISTS idx_ioc_store_case_id ON public.ioc_store(case_id);
