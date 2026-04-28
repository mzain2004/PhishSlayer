CREATE TABLE hunt_hypotheses (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  organization_id UUID REFERENCES organizations(id) ON DELETE CASCADE,
  title TEXT NOT NULL,
  hypothesis TEXT,
  mitre_technique TEXT,
  priority TEXT DEFAULT 'medium',
  status TEXT DEFAULT 'pending' CHECK (status IN ('pending','active','completed','dismissed')),
  data_sources TEXT[],
  search_patterns JSONB,
  findings_count INTEGER DEFAULT 0,
  created_by TEXT,
  ai_generated BOOLEAN DEFAULT false,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Enable RLS
ALTER TABLE hunt_hypotheses ENABLE ROW LEVEL SECURITY;

-- Org-scoped Select Policy
CREATE POLICY "Users can view their organization's hunt hypotheses"
  ON hunt_hypotheses
  FOR SELECT
  USING (organization_id IN (
    SELECT org_id FROM organization_members WHERE user_id = auth.uid()
  ));

-- Org-scoped All Policy
CREATE POLICY "Users can manage their organization's hunt hypotheses"
  ON hunt_hypotheses
  FOR ALL
  USING (organization_id IN (
    SELECT org_id FROM organization_members WHERE user_id = auth.uid()
  ))
  WITH CHECK (organization_id IN (
    SELECT org_id FROM organization_members WHERE user_id = auth.uid()
  ));
