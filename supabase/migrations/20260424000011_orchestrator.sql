-- ================================================================
-- PhishSlayer: Autonomous Orchestrator Schema
-- ================================================================

-- ── pipeline_runs table ──────────────────────────────────────────
CREATE TABLE IF NOT EXISTS public.pipeline_runs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  alert_id UUID REFERENCES public.alerts(id) ON DELETE CASCADE,
  org_id TEXT NOT NULL,
  started_at TIMESTAMPTZ DEFAULT now(),
  completed_at TIMESTAMPTZ,
  stages JSONB DEFAULT '[]'::jsonb,
  final_decision JSONB,
  error TEXT,
  duration_ms INTEGER
);

-- ── Enable RLS ───────────────────────────────────────────────────
ALTER TABLE public.pipeline_runs ENABLE ROW LEVEL SECURITY;

-- ── RLS Policies ─────────────────────────────────────────────────
DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename = 'pipeline_runs' AND policyname = 'pipeline_runs_policy') THEN
    CREATE POLICY "pipeline_runs_policy" ON public.pipeline_runs USING (auth.jwt() IS NOT NULL);
  END IF;
END $$;

-- ── Alerts table updates ─────────────────────────────────────────
ALTER TABLE public.alerts ADD COLUMN IF NOT EXISTS pipeline_run_id UUID;
ALTER TABLE public.alerts ADD COLUMN IF NOT EXISTS close_reason TEXT;
ALTER TABLE public.alerts ADD COLUMN IF NOT EXISTS assigned_level TEXT;

-- ── Cases table updates ──────────────────────────────────────────
ALTER TABLE public.cases ADD COLUMN IF NOT EXISTS assigned_level TEXT;
ALTER TABLE public.cases ADD COLUMN IF NOT EXISTS extra_data JSONB DEFAULT '{}'::jsonb;

-- ── Indices ──────────────────────────────────────────────────────
CREATE INDEX IF NOT EXISTS idx_pipeline_runs_alert_id ON public.pipeline_runs(alert_id);
CREATE INDEX IF NOT EXISTS idx_pipeline_runs_org_id ON public.pipeline_runs(org_id, started_at DESC);
