CREATE TABLE detection_rules (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  organization_id UUID REFERENCES organizations(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  type TEXT NOT NULL CHECK (type IN ('sigma', 'yara', 'custom')),
  rule_content TEXT NOT NULL,
  parsed_rule JSONB,
  is_active BOOLEAN DEFAULT true,
  severity TEXT DEFAULT 'medium',
  mitre_technique TEXT,
  hit_count INTEGER DEFAULT 0,
  last_hit_at TIMESTAMPTZ,
  created_by TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Enable RLS
ALTER TABLE detection_rules ENABLE ROW LEVEL SECURITY;

-- Org-scoped Policies
CREATE POLICY "Users can manage their organization's detection rules"
  ON detection_rules FOR ALL
  USING (organization_id IN (SELECT org_id FROM organization_members WHERE user_id = auth.uid()))
  WITH CHECK (organization_id IN (SELECT org_id FROM organization_members WHERE user_id = auth.uid()));

-- Helper function to increment hit count
CREATE OR REPLACE FUNCTION increment_rule_hit(rule_id UUID)
RETURNS void AS $$
BEGIN
  UPDATE detection_rules
  SET hit_count = hit_count + 1,
      last_hit_at = NOW()
  WHERE id = rule_id;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;
