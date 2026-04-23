-- ================================================================
-- PhishSlayer: Log Ingestion Schema
-- ================================================================

-- ── raw_logs table ──────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS public.raw_logs (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    org_id TEXT NOT NULL,
    source_type TEXT NOT NULL,
    source_ip TEXT,
    raw_content TEXT NOT NULL,
    parsed_fields JSONB DEFAULT '{}'::JSONB,
    normalized JSONB DEFAULT '{}'::JSONB,
    ingested_at TIMESTAMPTZ DEFAULT now(),
    processed BOOLEAN DEFAULT false,
    alert_created BOOLEAN DEFAULT false
);

-- ── Enable RLS ───────────────────────────────────────────────────
ALTER TABLE public.raw_logs ENABLE ROW LEVEL SECURITY;

-- ── RLS Policies ─────────────────────────────────────────────────
DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename = 'raw_logs' AND policyname = 'raw_logs_policy') THEN
    CREATE POLICY "raw_logs_policy" ON public.raw_logs FOR SELECT USING (auth.jwt() IS NOT NULL);
  END IF;
END $$;

-- Service role bypass
CREATE POLICY "Service role full access" ON public.raw_logs FOR ALL USING (auth.role() = 'service_role');

-- ── Indices ──────────────────────────────────────────────────────
CREATE INDEX IF NOT EXISTS idx_raw_logs_org_id ON public.raw_logs(org_id);
CREATE INDEX IF NOT EXISTS idx_raw_logs_source_type ON public.raw_logs(source_type);
CREATE INDEX IF NOT EXISTS idx_raw_logs_ingested_at ON public.raw_logs(ingested_at DESC);
CREATE INDEX IF NOT EXISTS idx_raw_logs_processed ON public.raw_logs(processed);
