// data.jsx — seed data + utility helpers for PhishSlayer prototype.
// All values are realistic-but-fake (RFC-5737 / docs IPs, fictional users).

const ATTACK_TYPES = [
  'Credential stuffing',
  'Impossible travel',
  'Brute force',
  'Phishing landing page',
  'Suspicious OAuth grant',
  'Tor exit node sign-in',
  'Anomalous data exfiltration',
  'Lateral movement (SMB)',
  'Token theft',
  'Mailbox rule abuse',
  'Password spray',
  'Service principal anomaly',
];

const USERS = [
  'a.harrington@contoso.com',
  'm.bilic@contoso.com',
  'j.okeefe@contoso.com',
  'svc-payroll@contoso.com',
  's.zheng@contoso.com',
  'r.delacruz@contoso.com',
  'finance-bot@contoso.com',
  'k.osei@contoso.com',
];

// IPs use TEST-NET / RFC-5737 ranges to keep them obviously fake but plausible.
const IPS = [
  '185.220.101.42',  // Tor-ish range
  '45.33.32.156',
  '203.0.113.74',
  '198.51.100.221',
  '203.0.113.18',
  '192.0.2.135',
  '198.51.100.6',
  '203.0.113.91',
  '85.62.10.211',
  '94.198.40.7',
];

const COUNTRIES = ['🇷🇺 RU', '🇨🇳 CN', '🇺🇸 US', '🇩🇪 DE', '🇧🇷 BR', '🇰🇵 KP', '🇳🇱 NL', '🇻🇳 VN'];

function shortId(prefix = '') {
  const hex = Math.random().toString(16).slice(2, 10);
  return prefix + hex;
}

const SEED_ALERTS = [
  {
    id: '3f92a1c0',
    severity: 'critical',
    attack: 'Credential stuffing',
    src_ip: '185.220.101.42',
    target: 'a.harrington@contoso.com',
    country: '🇷🇺 RU',
    status: 'triaging',
    confidence: null,
    age_seconds: 130,
    started_at: '12:34:01',
    resolved: false,
    blast_radius: 'user',
    fp_probability: 0.38,
    proposed_action: 'Revoke all sessions for a.harrington@contoso.com',
    proposed_action_short: 'sessions.revoke(user)',
    rollback_steps: [
      'Re-enable user account if flagged disabled',
      'Restore previous Conditional Access policy version',
      'Notify user via secondary email contact'
    ],
    side_effects: [
      'User logged out of all Microsoft 365 apps',
      'Outlook mobile + desktop will require re-auth',
      'Active Teams call (if any) will drop'
    ],
    recovery_time: '~5 min',
    rag_match: { source: 'APT-41 TTP report', page: 12, similarity: 0.87 }
  },
  {
    id: '8a2bf013',
    severity: 'high',
    attack: 'Impossible travel',
    src_ip: '45.33.32.156',
    target: 'm.bilic@contoso.com',
    country: '🇩🇪 DE → 🇧🇷 BR',
    status: 'escalated',
    confidence: 0.71,
    age_seconds: 510,
    started_at: '12:25:00',
    resolved: false,
    blast_radius: 'user',
    fp_probability: 0.22,
    proposed_action: 'Block sign-in from 45.33.32.156 + force MFA challenge',
    proposed_action_short: 'mfa.challenge(user)',
  },
  {
    id: 'c01a92e4',
    severity: 'medium',
    attack: 'Brute force',
    src_ip: '192.0.2.135',
    target: 'svc-payroll@contoso.com',
    country: '🇨🇳 CN',
    status: 'responded',
    confidence: 0.88,
    age_seconds: 920,
    started_at: '12:18:15',
    resolved: false,
    blast_radius: 'device',
    fp_probability: 0.08,
  },
  {
    id: 'b71e8f24',
    severity: 'high',
    attack: 'Suspicious OAuth grant',
    src_ip: '203.0.113.18',
    target: 'j.okeefe@contoso.com',
    country: '🇳🇱 NL',
    status: 'pending',
    confidence: null,
    age_seconds: 22,
    started_at: '12:35:48',
    resolved: false,
    blast_radius: 'org',
    fp_probability: 0.31,
    proposed_action: 'Revoke OAuth consent for "InvoiceProBoost" + audit org-wide grants',
    proposed_action_short: 'oauth.revoke(org)',
  },
  {
    id: '4d8c2a91',
    severity: 'critical',
    attack: 'Anomalous data exfiltration',
    src_ip: '198.51.100.221',
    target: 's.zheng@contoso.com',
    country: '🇰🇵 KP',
    status: 'escalated',
    confidence: 0.94,
    age_seconds: 1240,
    started_at: '12:08:30',
    resolved: false,
    blast_radius: 'tenant',
    fp_probability: 0.06,
    proposed_action: 'Quarantine mailbox + isolate device from corp network',
    proposed_action_short: 'mailbox.quarantine + device.isolate',
  },
  {
    id: 'e2f071b3',
    severity: 'medium',
    attack: 'Mailbox rule abuse',
    src_ip: '203.0.113.74',
    target: 'r.delacruz@contoso.com',
    country: '🇻🇳 VN',
    status: 'responded',
    confidence: 0.82,
    age_seconds: 1820,
    started_at: '11:59:12',
    resolved: false,
    blast_radius: 'user',
    fp_probability: 0.14,
  },
  {
    id: '7c19af52',
    severity: 'low',
    attack: 'Password spray',
    src_ip: '94.198.40.7',
    target: '*.contoso.com (12 users)',
    country: '🇧🇷 BR',
    status: 'pending',
    confidence: null,
    age_seconds: 4,
    started_at: '12:36:06',
    resolved: false,
    blast_radius: 'org',
    fp_probability: 0.45,
  },
  // Resolved (closed) — visible when AI Resolved group expanded.
  {
    id: '9af3211c',
    severity: 'low',
    attack: 'Tor exit node sign-in',
    src_ip: '185.220.101.42',
    target: 'k.osei@contoso.com',
    country: '🇩🇪 DE',
    status: 'closed',
    confidence: 0.91,
    age_seconds: 2240,
    started_at: '11:56:22',
    resolved: true,
    blast_radius: 'user',
    fp_probability: 0.07,
  },
  {
    id: '5b8d31f9',
    severity: 'medium',
    attack: 'Token theft',
    src_ip: '85.62.10.211',
    target: 'finance-bot@contoso.com',
    country: '🇪🇸 ES',
    status: 'closed',
    confidence: 0.96,
    age_seconds: 2810,
    started_at: '11:46:20',
    resolved: true,
    blast_radius: 'device',
    fp_probability: 0.03,
  },
  {
    id: 'a812ee03',
    severity: 'low',
    attack: 'Service principal anomaly',
    src_ip: '198.51.100.6',
    target: 'sp-graph-sync',
    country: '—',
    status: 'fp',
    confidence: 0.42,
    age_seconds: 3500,
    started_at: '11:35:30',
    resolved: true,
    blast_radius: 'org',
    fp_probability: 0.83,
  },
];

// L1 trace items for alert 3f92a1c0 (the hero).
const SEED_TRACE_L1 = [
  {
    tool: 'vt_check_ip',
    duration_ms: 340,
    status: 'ok',
    input: '185.220.101.42',
    result: { threat_score: 94, positives: '47/72', verdict: 'malicious' },
  },
  {
    tool: 'abuseipdb_check',
    duration_ms: 210,
    status: 'ok',
    input: '185.220.101.42',
    result: { abuse_confidence: 89, total_reports: 1240, last_reported: '4h ago' },
  },
  {
    tool: 'graph_get_signin_logs',
    duration_ms: 720,
    status: 'ok',
    input: 'a.harrington@contoso.com',
    result: { failed_24h: 38, success: 0, distinct_ips: 12, geo_spread: 'wide' },
  },
  {
    tool: 'rag_query',
    duration_ms: 180,
    status: 'ok',
    input: '"credential stuffing" Tor exit AND "APT-41"',
    result: { match: 'APT-41 TTP report p.12', similarity: 0.87, ttp: 'T1110.004' },
  },
];

// L2 trace items — streamed live in the prototype.
const SEED_TRACE_L2 = [
  {
    tool: 'graph_get_signin_logs',
    duration_ms: 880,
    status: 'ok',
    input: 'user=a.harrington@contoso.com last=72h',
    result: { sessions: 14, suspicious: 11, mfa_bypassed: 0 },
  },
  {
    tool: 'graph_get_user_risk',
    duration_ms: 410,
    status: 'ok',
    input: 'a.harrington@contoso.com',
    result: { risk_level: 'high', risk_score: 0.82, last_event: 'unfamiliarSignIn' },
  },
  {
    tool: 'wazuh_query_endpoint',
    duration_ms: 1120,
    status: 'ok',
    input: 'host=harrington-mbp 24h',
    result: { processes_flagged: 0, persistence: 'none', wazuh_score: 0.18 },
  },
  {
    tool: 'rag_query_playbook',
    duration_ms: 220,
    status: 'ok',
    input: '"credential stuffing" remediation',
    result: { playbook: 'PB-CS-04', confidence: 0.91, recommend: 'session_revoke' },
  },
];

// Hunt log lines — for the L3 view.
const SEED_HUNT_LINES = [
  { t: '12:34:08', agent: 'reader', msg: 'Loading alert context for 3f92a1c0...' },
  { t: '12:34:09', agent: 'reader', msg: 'Found 3 similar past incidents (avg sim 0.81)' },
  { t: '12:34:11', agent: 'reader', msg: 'Context ready — 4 IOCs, 1 user, 1 device identified' },
  { t: '12:34:12', agent: 'hunter', msg: 'Querying VirusTotal for ip:185.220.101.42 ...' },
  { t: '12:34:13', agent: 'hunter', msg: 'VT verdict: malicious (47/72) — Tor exit + brute-force history' },
  { t: '12:34:14', agent: 'hunter', msg: 'Crawling associated-domain.cc for redirect chain...' },
  { t: '12:34:16', agent: 'hunter', msg: 'Resolved → 198.51.100.4 → kit-2024.tld (phishing kit, fingerprint match)' },
  { t: '12:34:17', agent: 'hunter', msg: 'Found 2 related campaigns in RAG: APT-41 (sim 0.89), FIN8 (sim 0.61)' },
  { t: '12:34:18', agent: 'hunter', msg: 'Expanding IOC graph — 2 new IPs, 1 hash, 1 domain' },
  { t: '12:34:20', agent: 'hunter', msg: 'Pivoting on hash 3f924e... → 5 historical detections across tenants' },
  { t: '12:34:21', agent: 'reviewer', msg: 'Hunter complete. Synthesizing report...' },
  { t: '12:34:23', agent: 'reviewer', msg: 'Cross-referencing with MITRE ATT&CK matrix' },
  { t: '12:34:24', agent: 'reviewer', msg: 'Mapping to T1110, T1078, T1133' },
  { t: '12:34:25', agent: 'reviewer', msg: 'Drafting recommendations (3 actions, ranked by impact)' },
  { t: '12:34:27', agent: 'reviewer', msg: 'Report ready — confidence 0.89, recommend immediate response' },
];

const SEED_IOCS = [
  { type: 'IP',     value: '185.220.101.42',                 score: 94, first_seen: '4h ago',  related: 8 },
  { type: 'IP',     value: '198.51.100.4',                   score: 78, first_seen: '12h ago', related: 3 },
  { type: 'Domain', value: 'associated-domain.cc',           score: 88, first_seen: '2h ago',  related: 5 },
  { type: 'Domain', value: 'kit-2024.tld',                   score: 91, first_seen: '6h ago',  related: 4 },
  { type: 'Hash',   value: '3f924e51c0a8b...d792',           score: 96, first_seen: '1d ago',  related: 11 },
];

const MITRE_TECHNIQUES = [
  { id: 'T1110.004', name: 'Credential Stuffing' },
  { id: 'T1078',     name: 'Valid Accounts' },
  { id: 'T1133',     name: 'External Remote Services' },
  { id: 'T1556',     name: 'Modify Authentication Process' },
  { id: 'T1071.001', name: 'Application Layer Protocol' },
];

const RECOMMENDATIONS = [
  'Revoke all active sessions for a.harrington@contoso.com and force password reset on next sign-in.',
  'Add Conditional Access policy: block sign-ins from Tor exit nodes (named-location feed).',
  'Review past 72h of VPN access logs for the same user-agent fingerprint and pivot on matches.',
];

// Evolution events
const EVO_EVENTS = [
  {
    id: 'ev-001',
    when: '2h ago',
    type: 'OPENSPACE',
    level: 'L1',
    status: 'PROPOSED',
    title: 'Action space rebalanced for credential_stuffing',
    desc: 'vt_check_ip promoted to rank #1 — outperforms abuseipdb on Tor-affiliated IPs.',
    expected_improvement: '+6.2% accuracy',
    before: ['abuseipdb_check', 'vt_check_ip', 'urlscan_submit'],
    after:  ['vt_check_ip',     'abuseipdb_check', 'urlscan_submit'],
    changed_indices: [0, 1],
  },
  {
    id: 'ev-002',
    when: '6h ago',
    type: 'EVOMAP',
    level: 'L2',
    status: 'PROPOSED',
    title: 'New capability proposed: graph_revoke_token',
    desc: 'EvoMap derived a tighter scope wrapper around graph_revoke_session limited to a single OAuth scope.',
    expected_improvement: 'reduces blast radius from user→token',
  },
  {
    id: 'ev-003',
    when: 'Yesterday',
    type: 'HALO',
    level: 'L2',
    status: 'APPLIED',
    title: 'Confidence threshold raised',
    desc: 'Threshold updated 0.85 → 0.87 for L2 auto-execute. Applied by John (SOC Manager) at 14:32.',
    result: 'FP rate dropped 1.2% in 24h',
  },
  {
    id: 'ev-004',
    when: '2 days ago',
    type: 'OPENSPACE',
    level: 'L1',
    status: 'APPLIED',
    title: 'Tool added: shodan_lookup',
    desc: 'shodan_lookup added to L1 toolbelt for IP reputation enrichment.',
    result: 'Median L1 latency unchanged (3.2s); accuracy +1.4%',
  },
  {
    id: 'ev-005',
    when: '3 days ago',
    type: 'HALO',
    level: 'L1',
    status: 'REJECTED',
    title: 'Token budget reduction',
    desc: 'HALO suggested L1 token cap 1500 → 1200. Rejected — would have truncated 8% of traces.',
  },
];

// Metrics
const METRICS = {
  mttr_min: 4.2,
  mttr_delta: -12,
  alerts_today: 247,
  alerts_delta: 18,
  auto_close_pct: 82,
  auto_close_delta: 4,
  fp_rate_pct: 3.1,
  fp_delta: -0.8,
  // 7-day MTTR trend (minutes)
  mttr_trend: [6.4, 5.9, 5.5, 5.1, 4.8, 4.5, 4.2],
  // 7-day alert volume by severity
  alert_volume: [
    { day: 'Mon', critical: 3,  high: 18, medium: 41, low: 95 },
    { day: 'Tue', critical: 1,  high: 22, medium: 38, low: 110 },
    { day: 'Wed', critical: 5,  high: 31, medium: 52, low: 128 },
    { day: 'Thu', critical: 2,  high: 17, medium: 44, low: 102 },
    { day: 'Fri', critical: 4,  high: 26, medium: 48, low: 118 },
    { day: 'Sat', critical: 1,  high: 9,  medium: 22, low: 64  },
    { day: 'Sun', critical: 6,  high: 28, medium: 51, low: 162 },
  ],
  agent_perf: [
    { agent: 'L1 Triage',   latency: '3.2s',  tokens: '1,240',  success: '98.2%', active: true },
    { agent: 'L2 Response', latency: '11.4s', tokens: '3,890',  success: '94.7%', active: true },
    { agent: 'L3 Hunt',     latency: '67s',   tokens: '8,240',  success: '91.2%', active: true },
    { agent: 'Reader',      latency: '2.8s',  tokens: '910',    success: '99.0%', active: true },
    { agent: 'Hunter',      latency: '14.6s', tokens: '4,120',  success: '93.8%', active: true },
    { agent: 'Reviewer',    latency: '8.1s',  tokens: '2,470',  success: '96.4%', active: true },
  ],
};

// Generate a new "incoming" alert for simulated realtime feed.
function makeIncomingAlert() {
  const severities = ['critical', 'high', 'medium', 'low'];
  // Weighted: more medium/high than critical/low.
  const weights = [0.12, 0.32, 0.42, 0.14];
  const r = Math.random();
  let cum = 0, sev = 'medium';
  for (let i = 0; i < severities.length; i++) {
    cum += weights[i];
    if (r <= cum) { sev = severities[i]; break; }
  }
  return {
    id: shortId(),
    severity: sev,
    attack: ATTACK_TYPES[Math.floor(Math.random() * ATTACK_TYPES.length)],
    src_ip: IPS[Math.floor(Math.random() * IPS.length)],
    target: USERS[Math.floor(Math.random() * USERS.length)],
    country: COUNTRIES[Math.floor(Math.random() * COUNTRIES.length)],
    status: sev === 'low' ? 'pending' : 'triaging',
    confidence: null,
    age_seconds: 0,
    started_at: 'now',
    resolved: false,
    blast_radius: ['user', 'device', 'org'][Math.floor(Math.random() * 3)],
    fp_probability: Math.round(Math.random() * 50) / 100,
    isNew: true,
  };
}

function ageString(seconds) {
  if (seconds < 60) return Math.max(1, Math.floor(seconds)) + 's';
  if (seconds < 3600) return Math.floor(seconds / 60) + 'm';
  if (seconds < 86400) return Math.floor(seconds / 3600) + 'h';
  return Math.floor(seconds / 86400) + 'd';
}

function confLevel(score) {
  if (score == null) return 'empty';
  if (score >= 0.85) return 'high';
  if (score >= 0.6) return 'medium';
  return 'low';
}

Object.assign(window, {
  SEED_ALERTS, SEED_TRACE_L1, SEED_TRACE_L2, SEED_HUNT_LINES,
  SEED_IOCS, MITRE_TECHNIQUES, RECOMMENDATIONS, EVO_EVENTS, METRICS,
  makeIncomingAlert, ageString, confLevel, shortId,
});
