CREATE TABLE url_scans (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  organization_id UUID REFERENCES organizations(id) ON DELETE CASCADE,
  url TEXT NOT NULL,
  verdict TEXT,
  score INTEGER,
  scan_results JSONB,
  scanned_at TIMESTAMPTZ DEFAULT NOW()
);

-- Enable RLS
ALTER TABLE url_scans ENABLE ROW LEVEL SECURITY;

-- Org-scoped Select Policy
CREATE POLICY "Users can view their organization's url scans"
  ON url_scans
  FOR SELECT
  USING (organization_id IN (
    SELECT org_id FROM organization_members WHERE user_id = auth.uid()
  ));

-- Org-scoped Insert Policy
CREATE POLICY "Users can insert url scans for their organization"
  ON url_scans
  FOR INSERT
  WITH CHECK (organization_id IN (
    SELECT org_id FROM organization_members WHERE user_id = auth.uid()
  ));
