CREATE TABLE email_analyses (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  organization_id UUID REFERENCES organizations(id) ON DELETE CASCADE,
  raw_headers TEXT,
  parsed_data JSONB,
  groq_analysis JSONB,
  risk_score INTEGER,
  flags TEXT[],
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Enable RLS
ALTER TABLE email_analyses ENABLE ROW LEVEL SECURITY;

-- Org-scoped Select Policy
CREATE POLICY "Users can view their organization's email analyses"
  ON email_analyses
  FOR SELECT
  USING (organization_id IN (
    SELECT org_id FROM organization_members WHERE user_id = auth.uid()
  ));

-- Org-scoped Insert Policy
CREATE POLICY "Users can insert email analyses for their organization"
  ON email_analyses
  FOR INSERT
  WITH CHECK (organization_id IN (
    SELECT org_id FROM organization_members WHERE user_id = auth.uid()
  ));
