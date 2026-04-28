CREATE TABLE user_risk_profiles (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  organization_id UUID REFERENCES organizations(id) ON DELETE CASCADE,
  user_id TEXT NOT NULL,
  risk_score INTEGER DEFAULT 0,
  risk_level TEXT DEFAULT 'LOW',
  anomalies JSONB DEFAULT '[]',
  triggered_rules TEXT[],
  last_anomaly_at TIMESTAMPTZ,
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(user_id, organization_id)
);

CREATE TABLE uba_anomaly_events (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  organization_id UUID REFERENCES organizations(id) ON DELETE CASCADE,
  user_id TEXT NOT NULL,
  anomaly_type TEXT,
  details JSONB,
  risk_score INTEGER,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Enable RLS
ALTER TABLE user_risk_profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE uba_anomaly_events ENABLE ROW LEVEL SECURITY;

-- Org-scoped Select Policies
CREATE POLICY "Users can view their organization's risk profiles"
  ON user_risk_profiles FOR SELECT
  USING (organization_id IN (SELECT org_id FROM organization_members WHERE user_id = auth.uid()));

CREATE POLICY "Users can view their organization's anomaly events"
  ON uba_anomaly_events FOR SELECT
  USING (organization_id IN (SELECT org_id FROM organization_members WHERE user_id = auth.uid()));

-- Service Role or System Insert (Assuming system-driven)
CREATE POLICY "System can manage risk profiles"
  ON user_risk_profiles FOR ALL
  USING (true) WITH CHECK (true);

CREATE POLICY "System can manage anomaly events"
  ON uba_anomaly_events FOR ALL
  USING (true) WITH CHECK (true);
