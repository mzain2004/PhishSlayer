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
