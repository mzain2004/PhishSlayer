export interface RawAlert {
  id: string;
  rule_id: string;
  source_ip: string;
  title: string;
  severity: string;
  created_at: string;
  [key: string]: any;
}

export interface DeduplicatedCase {
  id: string;
  alerts: RawAlert[];
  count: number;
  first_seen: string;
  last_seen: string;
  representative_alert: RawAlert;
}
