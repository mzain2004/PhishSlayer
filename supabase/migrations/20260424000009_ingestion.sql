-- ================================================================
-- PhishSlayer: Log Ingestion Schema
-- ================================================================

-- ── raw_logs table ──────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS public.raw_logs (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    organization_id TEXT NOT NULL,
    source_type TEXT NOT NULL,
    source_ip TEXT,
    raw_content TEXT NOT NULL,
    parsed_fields JSONB DEFAULT '{}'::JSONB,
    normalized JSONB DEFAULT '{}'::JSONB,
    ingested_at TIMESTAMPTZ DEFAULT now(),
    processed BOOLEAN DEFAULT false,
    alert_created BOOLEAN DEFAULT false
);

-- ... (skipping RLS)

-- ── Indices ──────────────────────────────────────────────────────
CREATE INDEX IF NOT EXISTS idx_raw_logs_organization_id ON public.raw_logs(organization_id);
CREATE INDEX IF NOT EXISTS idx_raw_logs_source_type ON public.raw_logs(source_type);
CREATE INDEX IF NOT EXISTS idx_raw_logs_ingested_at ON public.raw_logs(ingested_at DESC);
CREATE INDEX IF NOT EXISTS idx_raw_logs_processed ON public.raw_logs(processed);
