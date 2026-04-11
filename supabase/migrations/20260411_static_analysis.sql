CREATE TABLE static_analysis (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  alert_id UUID REFERENCES alerts(id) ON DELETE SET NULL,
  file_name TEXT,
  file_hash_md5 TEXT,
  file_hash_sha256 TEXT,
  file_size_bytes INTEGER,
  file_type TEXT,
  entropy_score FLOAT,
  entropy_risk TEXT CHECK (entropy_risk IN ('low', 'medium', 'high', 'critical')),
  strings_extracted JSONB DEFAULT '[]',
  suspicious_strings JSONB DEFAULT '[]',
  virustotal_score TEXT,
  virustotal_detected INTEGER DEFAULT 0,
  virustotal_total INTEGER DEFAULT 0,
  virustotal_result JSONB DEFAULT '{}',
  pe_imports JSONB DEFAULT '[]',
  pe_sections JSONB DEFAULT '[]',
  mitre_techniques JSONB DEFAULT '[]',
  gemini_report TEXT,
  risk_score INTEGER DEFAULT 0 CHECK (risk_score >= 0 AND risk_score <= 100),
  verdict TEXT CHECK (verdict IN ('clean', 'suspicious', 'malicious', 'unknown')),
  analysis_duration_ms INTEGER,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

ALTER TABLE static_analysis ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Service role full access" ON static_analysis
  FOR ALL USING (auth.role() = 'service_role');

CREATE INDEX idx_static_analysis_alert_id ON static_analysis(alert_id);
CREATE INDEX idx_static_analysis_verdict ON static_analysis(verdict);
CREATE INDEX idx_static_analysis_created_at ON static_analysis(created_at DESC);
