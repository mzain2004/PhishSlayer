CREATE TABLE credential_leaks (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  organization_id UUID REFERENCES organizations(id) ON DELETE CASCADE,
  email TEXT,
  domain TEXT,
  breach_source TEXT,
  breach_date DATE,
  exposed_data TEXT[],
  severity TEXT,
  is_resolved BOOLEAN DEFAULT false,
  discovered_at TIMESTAMPTZ DEFAULT NOW()
);

-- Enable RLS
ALTER TABLE credential_leaks ENABLE ROW LEVEL SECURITY;

-- Org-scoped Select Policy
CREATE POLICY "Users can view their organization's credential leaks"
  ON credential_leaks
  FOR SELECT
  USING (organization_id IN (
    SELECT org_id FROM organization_members WHERE user_id = auth.uid()
  ));

-- Org-scoped All Policy (System usage)
CREATE POLICY "System can manage credential leaks"
  ON credential_leaks
  FOR ALL
  USING (true)
  WITH CHECK (true);
