-- ================================================================
-- PhishSlayer: Autonomous Orchestrator Schema
-- ================================================================

-- ── pipeline_runs table ──────────────────────────────────────────
CREATE TABLE IF NOT EXISTS public.pipeline_runs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  alert_id UUID REFERENCES public.alerts(id) ON DELETE CASCADE,
  organization_id TEXT NOT NULL,
  started_at TIMESTAMPTZ DEFAULT now(),
  completed_at TIMESTAMPTZ,
  stages JSONB DEFAULT '[]'::jsonb,
  final_decision JSONB,
  error TEXT,
  duration_ms INTEGER
);

-- ... (skipping RLS)

-- ── Indices ──────────────────────────────────────────────────────
CREATE INDEX IF NOT EXISTS idx_pipeline_runs_alert_id ON public.pipeline_runs(alert_id);
CREATE INDEX IF NOT EXISTS idx_pipeline_runs_organization_id ON public.pipeline_runs(organization_id, started_at DESC);
