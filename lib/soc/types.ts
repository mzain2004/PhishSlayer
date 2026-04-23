export interface RawAlert {
  id: string;
  rule_id: string;
  rule_description: string;
  source_ip: string;
  destination_ip: string;
  agent_id: string;
  agent_name: string;
  alert_type: string;
  severity_level: number; // 1-15
  timestamp: string;
  raw_log: any; // jsonb
  
  // Maintain compatibility with existing code
  title: string;
}

export interface DeduplicatedGroup {
  group_key: string;
  rule_id: string;
  source_ip: string;
  alerts: RawAlert[];
  count: number;
  first_seen: Date;
  last_seen: Date;
  representative_alert: RawAlert;
  suppressed: boolean;
  suppression_reason: string | null;
}

export interface DeduplicatedCase {
  id: string;
  alerts: RawAlert[];
  count: number;
  first_seen: string;
  last_seen: string;
  representative_alert: RawAlert;
}

export interface IOC {
  type: "ip" | "domain" | "hash" | "email" | "url";
  value: string;
  malicious: boolean | null;
  confidence: number | null;
  source: string | null;
}

export interface StepResult {
  success: boolean;
  output: any | null;
  error: string | null;
  duration_ms: number;
}

export interface PlaybookContext {
  case_id: string;
  alert: RawAlert;
  iocs: IOC[];
  org_id: string;
  analyst_id: string | null;
  wazuh_agent_id: string | null;
  previous_steps: Record<string, StepResult>;
}

export interface PlaybookStep {
  id: string;
  name: string;
  description: string;
  action: (context: PlaybookContext) => Promise<StepResult>;
  rollback?: (context: PlaybookContext) => Promise<void>;
  timeout_ms?: number;
  required?: boolean;
}

export interface Playbook {
  id: string;
  name: string;
  description: string;
  steps: PlaybookStep[];
}

export interface PlaybookResult {
  playbook_id: string;
  case_id: string;
  success: boolean;
  steps_executed: number;
  steps_failed: number;
  total_duration_ms: number;
  step_results: Record<string, StepResult>;
  escalate_to_l3: boolean;
  escalation_reason: string | null;
}

export interface EnrichmentSource {
  name: string;
  malicious: boolean | null;
  score: number | null;
  raw: any | null;
  error: string | null;
}

export interface EnrichmentResult {
  ioc_type: "ip" | "domain" | "hash" | "email" | "url";
  value: string;
  malicious: boolean;
  confidence_score: number; // 0-100
  sources: EnrichmentSource[];
  cached: boolean;
  enriched_at: Date;
  raw_data: any;
  tags: string[];
  country: string | null;
  asn: string | null;
  threat_type: string | null;
}

export interface SuppressionRule {
  id: string;
  rule_type: "ip" | "cidr" | "rule_id" | "hostname" | "application";
  value: string;
  reason: string;
  created_by: string;
  hit_count: number;
  last_hit: Date | null;
  active: boolean;
}

export interface AutoCloseResult {
  case_id: string;
  action: "suppressed" | "auto_closed" | "escalated";
  reason: string;
  suppression_rule_id: string | null;
  confidence: number; // 0-100
  timestamp: Date;
}

export interface FeedbackEntry {
  id?: string;
  case_id: string;
  original_action: string;
  analyst_decision: "true_positive" | "false_positive" | "benign";
  analyst_id: string;
  notes: string | null;
  created_at: Date;
  alert_type: string;
  source_ip: string;
  rule_id: string;
}

export interface UserBehaviorProfile {
  user_id: string;
  username: string;
  org_id: string;
  baseline_login_hours: number[]; // 0-23
  baseline_locations: string[]; // country codes
  baseline_devices: string[];
  avg_daily_alerts: number;
  risk_score: number; // 0-100
  last_updated: Date;
  anomalies: UEBAAnomaly[];
}

export interface UEBAAnomaly {
  id: string;
  user_id: string;
  entity_id: string;
  entity_type: string;
  anomaly_type: "impossible_travel" | "off_hours_login" | "new_device" | "excessive_failed_logins" | "privilege_escalation" | "mass_download" | "lateral_movement";
  severity: "low" | "medium" | "high" | "critical";
  description: string;
  evidence: any;
  detected_at: Date;
  case_id: string | null;
  suppressed: boolean;
}

export interface RiskFactor {
  name: string;
  contribution: number;
  description: string;
}

export interface EntityRiskScore {
  entity_id: string;
  entity_type: "user" | "host" | "ip";
  score: number; // 0-100
  factors: RiskFactor[];
  last_calculated: Date;
  trend: "increasing" | "decreasing" | "stable";
}
