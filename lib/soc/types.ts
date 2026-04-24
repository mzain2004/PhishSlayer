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
  mitre_tactic?: string;
  mitre_technique?: string;
  
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

export interface HuntHypothesis {
  id: string;
  name: string;
  description: string;
  mitre_tactic: string;
  mitre_technique: string;
  query: string;
  severity: "low" | "medium" | "high" | "critical";
  last_run: Date | null;
  last_findings: number;
  active: boolean;
}

export interface HuntMission {
  id: string;
  hypothesis_id: string;
  hypothesis_name: string;
  status: "scheduled" | "running" | "completed" | "failed";
  started_at: Date | null;
  completed_at: Date | null;
  findings: HuntFinding[];
  alerts_scanned: number;
  sigma_rule_generated: boolean;
  org_id: string;
}

export interface HuntFinding {
  id: string;
  mission_id: string;
  hypothesis_id: string;
  title: string;
  description: string;
  severity: string;
  evidence: any;
  affected_assets: string[];
  mitre_tactic: string;
  mitre_technique: string;
  recommended_action: string;
  created_at: Date;
  case_id: string | null;
}

export interface SigmaLogsource {
  category: string;
  product: string;
  service: string | null;
}

export interface SigmaDetection {
  selection: any;
  condition: string;
  timeframe: string | null; // e.g., 15m, 1h
}

export interface SigmaRule {
  id: string;
  title: string;
  description: string;
  status: "experimental" | "test" | "stable";
  level: "low" | "medium" | "high" | "critical";
  logsource: SigmaLogsource;
  detection: SigmaDetection;
  falsepositives: string[];
  tags: string[];
  author: string;
  created_at: Date;
  hunt_finding_id: string | null;
  tested: boolean;
  deployed: boolean;
  wazuh_rule_id: string | null;
}

export interface SigmaTestResult {
  matched_alerts: number;
  false_positive_rate: number;
  test_duration_ms: number;
  sample_matches: any[];
  approved: boolean;
}

export interface SigmaGenerationResult {
  rule: SigmaRule;
  yaml_content: string;
  test_result: SigmaTestResult | null;
  deployed: boolean;
  wazuh_rule_id: string | null;
}

export interface ThreatIntelEntry {
  id: string;
  source: "otx" | "misp" | "internal";
  ioc_type: "ip" | "domain" | "hash" | "email" | "url";
  value: string;
  threat_type: string;
  confidence: number; // 0-100
  severity: "low" | "medium" | "high" | "critical";
  tags: string[];
  mitre_techniques: string[];
  first_seen: Date;
  last_seen: Date;
  expiry: Date | null;
  active: boolean;
  raw_data: any;
  case_id: string | null;
}

export interface OTXPulse {
  id: string;
  name: string;
  description: string;
  tags: string[];
  indicators: OTXIndicator[];
  created: Date;
  modified: Date;
}

export interface OTXIndicator {
  type: string;
  indicator: string;
  description: string | null;
}

export interface MISPEvent {
  id: string;
  info: string;
  threat_level_id: string;
  attributes: MISPAttribute[];
  tags: string[];
  date: string;
}

export interface MISPAttribute {
  type: string;
  value: string;
  comment: string | null;
  to_ids: boolean;
  timestamp: string;
}

export interface ThreatIntelStats {
  total_indicators: number;
  active_indicators: number;
  sources_breakdown: Record<string, number>;
  last_sync_otx: Date | null;
  last_sync_misp: Date | null;
  top_threat_types: string[];
  indicators_added_24h: number;
}

export type KillChainStage = "initial_access" | "execution" | "persistence" | "privilege_escalation" | "defense_evasion" | "credential_access" | "discovery" | "lateral_movement" | "collection" | "exfiltration" | "command_and_control";

export interface AttackPathNode {
  id: string;
  stage: KillChainStage;
  alert_id: string;
  timestamp: Date;
  description: string;
  affected_asset: string;
  evidence: any;
}

export interface AttackPath {
  id: string;
  nodes: AttackPathNode[];
  root_cause_alert_id: string;
  target_asset: string;
  risk_score: number;
  timeline_ms: number;
}

export interface NormalizedLog {
  timestamp: Date;
  source_ip: string | null;
  destination_ip: string | null;
  user: string | null;
  hostname: string | null;
  action: string;
  outcome: "success" | "failure" | "unknown";
  severity: number; // 1-15
  category: string;
  raw_event_id: string | null;
  mitre_tactic: string | null;
  mitre_technique: string | null;
  extra_fields: any;
}

export interface RawLogEntry {
  id: string;
  source_type: "syslog" | "cef" | "leef" | "json" | "email" | "cloudtrail" | "azure_activity";
  source_ip: string | null;
  raw_content: string;
  parsed_fields: any;
  ingested_at: Date;
  normalized: NormalizedLog | null;
  org_id: string;
}

export interface LogIngestionStats {
  total_received: number;
  total_parsed: number;
  total_failed: number;
  sources_breakdown: Record<string, number>;
  avg_parse_time_ms: number;
  last_ingested_at: Date | null;
}

export interface CEFEvent {
  version: string;
  device_vendor: string;
  device_product: string;
  device_version: string;
  signature_id: string;
  name: string;
  severity: string;
  extensions: Record<string, string>;
}

export interface SLAConfig {
  p1_response_minutes: number;
  p2_response_minutes: number;
  p3_response_minutes: number;
  p4_response_minutes: number;
  breach_notify_email: string | null;
}

export interface TenantBranding {
  logo_url: string | null;
  primary_color: string;
  company_name: string;
  report_footer: string | null;
}

export interface Tenant {
  id: string;
  name: string;
  slug: string;
  plan: "starter" | "professional" | "enterprise";
  status: "active" | "suspended" | "trial";
  owner_user_id: string;
  sla_config: SLAConfig;
  branding: TenantBranding;
  created_at: Date;
  trial_ends_at: Date | null;
  alert_quota_monthly: number;
  alerts_used_this_month: number;
}

export interface TenantUser {
  id: string;
  tenant_id: string;
  user_id: string;
  role: "owner" | "analyst" | "manager" | "readonly";
  invited_at: Date;
  accepted_at: Date | null;
  active: boolean;
}

export interface TenantStats {
  tenant_id: string;
  alerts_24h: number;
  open_cases: number;
  mttd_minutes: number;
  mttr_minutes: number;
  sla_breaches_24h: number;
  top_alert_types: string[];
  risk_score: number; // 0-100
}

export interface WhitelabelAPIKey {
  id: string;
  tenant_id: string;
  key_hash: string;
  label: string;
  created_at: Date;
  last_used_at: Date | null;
  permissions: string[];
  active: boolean;
}

export interface TopAlertType {
  alert_type: string;
  count: number;
  percentage: number;
}

export interface ComplianceControl {
  control_id: string;
  control_name: string;
  description: string;
  status: "implemented" | "partial" | "not_implemented";
  evidence: string[];
  phishslayer_features: string[];
}

export interface ComplianceMapping {
  framework: "nist_csf" | "iso_27001" | "soc2";
  controls: ComplianceControl[];
  coverage_percentage: number;
  last_assessed_at: Date;
}

export interface SOCDashboardMetrics {
  org_id: string;
  period_hours: number;
  total_alerts: number;
  open_alerts: number;
  closed_alerts: number;
  mttd_minutes: number;
  mttr_minutes: number;
  sla_breaches: number;
  alert_volume_by_hour: number[];
  top_alert_types: TopAlertType[];
  top_source_ips: string[];
  active_cases: number;
  critical_cases: number;
  hunt_missions_run: number;
  sigma_rules_generated: number;
  risk_score: number; // 0-100
  trend_vs_previous_period: "improving" | "degrading" | "stable";
}

export interface ExecutiveReport {
  id: string;
  org_id: string;
  period_start: Date;
  period_end: Date;
  generated_at: Date;
  metrics: SOCDashboardMetrics;
  compliance: ComplianceMapping[];
  key_findings: string[];
  recommendations: string[];
  risk_trend: string;
  pdf_url: string | null;
}
