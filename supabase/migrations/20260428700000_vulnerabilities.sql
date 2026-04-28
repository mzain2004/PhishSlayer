CREATE TABLE vulnerabilities (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  organization_id UUID REFERENCES organizations(id) ON DELETE CASCADE,
  asset_id UUID,
  cve_id TEXT,
  cvss_score NUMERIC,
  severity TEXT,
  description TEXT,
  affected_product TEXT,
  patch_available BOOLEAN DEFAULT false,
  status TEXT DEFAULT 'open' CHECK (status IN ('open','in_progress','resolved','accepted')),
  discovered_at TIMESTAMPTZ DEFAULT NOW(),
  resolved_at TIMESTAMPTZ
);

CREATE INDEX idx_vuln_org ON vulnerabilities(organization_id);
CREATE INDEX idx_vuln_severity ON vulnerabilities(severity);

-- Enable RLS
ALTER TABLE vulnerabilities ENABLE ROW LEVEL SECURITY;

-- Org-scoped Select Policy
CREATE POLICY "Users can view their organization's vulnerabilities"
  ON vulnerabilities
  FOR SELECT
  USING (organization_id IN (
    SELECT org_id FROM organization_members WHERE user_id = auth.uid()
  ));

-- Org-scoped All Policy
CREATE POLICY "Users can manage their organization's vulnerabilities"
  ON vulnerabilities
  FOR ALL
  USING (organization_id IN (
    SELECT org_id FROM organization_members WHERE user_id = auth.uid()
  ))
  WITH CHECK (organization_id IN (
    SELECT org_id FROM organization_members WHERE user_id = auth.uid()
  ));
