import { HuntHypothesis } from "../types";

export const HYPOTHESES: Record<string, HuntHypothesis> = {
  powershell_abuse: {
    id: "powershell_abuse",
    name: "PowerShell Abuse Detection",
    description: "Detection of suspicious PowerShell commands including encoded commands and downloaders.",
    mitre_tactic: "Execution",
    mitre_technique: "T1059.001",
    query: "raw_log::text ~* '(powershell|encodedcommand|bypass|downloadstring|invoke-expression|IEX)'",
    severity: "critical",
    last_run: null,
    last_findings: 0,
    active: true
  },
  impossible_travel: {
    id: "impossible_travel",
    name: "Impossible Travel Detection",
    description: "Identify users logging in from geographically distant locations in an impossibly short timeframe.",
    mitre_tactic: "Initial Access",
    mitre_technique: "T1078",
    query: "anomaly_type = 'impossible_travel'", // Logic handled via join in engine
    severity: "critical",
    last_run: null,
    last_findings: 0,
    active: true
  },
  pass_the_hash: {
    id: "pass_the_hash",
    name: "Pass-the-Hash Attack",
    description: "Detection of potential Pass-the-Hash (PtH) activity using NTLM authentication artifacts.",
    mitre_tactic: "Lateral Movement",
    mitre_technique: "T1550.002",
    query: "raw_log::text ~* '(NTLM|pass-the-hash|pth|mimikatz|sekurlsa|lsass)'",
    severity: "critical",
    last_run: null,
    last_findings: 0,
    active: true
  },
  data_staging: {
    id: "data_staging",
    name: "Data Staging Detection",
    description: "Detection of data staging activity in temporary or staging directories.",
    mitre_tactic: "Collection",
    mitre_technique: "T1074",
    query: "raw_log::text ~* '(temp|staging|compress|zip|rar|7zip)'",
    severity: "high",
    last_run: null,
    last_findings: 0,
    active: true
  },
  lolbins: {
    id: "lolbins",
    name: "Living off the Land Binaries",
    description: "Identify misuse of legitimate system binaries for malicious purposes.",
    mitre_tactic: "Defense Evasion",
    mitre_technique: "T1218",
    query: "raw_log::text ~* '(certutil|regsvr32|mshta|wscript|cscript|rundll32|msiexec)'",
    severity: "high",
    last_run: null,
    last_findings: 0,
    active: true
  },
  new_admin_accounts: {
    id: "new_admin_accounts",
    name: "New Admin Account Creation",
    description: "Detection of new local or domain administrator account creation.",
    mitre_tactic: "Persistence",
    mitre_technique: "T1136",
    query: "raw_log::text ~* '(useradd|net user|new account|administrator|admin)' AND raw_log::text ~* 'created'",
    severity: "high",
    last_run: null,
    last_findings: 0,
    active: true
  },
  large_file_transfers: {
    id: "large_file_transfers",
    name: "Abnormal Large File Transfer",
    description: "Detection of unusually large data transfers that may indicate exfiltration.",
    mitre_tactic: "Exfiltration",
    mitre_technique: "T1041",
    query: "CAST(JSONB_EXTRACT_PATH_TEXT(raw_log, 'data', 'bytes_transferred') AS BIGINT) > 104857600",
    severity: "high",
    last_run: null,
    last_findings: 0,
    active: true
  },
  disabled_security_tools: {
    id: "disabled_security_tools",
    name: "Security Tool Tampering",
    description: "Detection of security tools being disabled or terminated.",
    mitre_tactic: "Defense Evasion",
    mitre_technique: "T1562",
    query: "raw_log::text ~* '(defender|antivirus|firewall|wazuh|sysmon)' AND raw_log::text ~* '(stopped|disabled|killed|terminated)'",
    severity: "critical",
    last_run: null,
    last_findings: 0,
    active: true
  },
  wmi_persistence: {
    id: "wmi_persistence",
    name: "WMI Persistence Detection",
    description: "Identify persistence mechanisms using Windows Management Instrumentation (WMI).",
    mitre_tactic: "Persistence",
    mitre_technique: "T1546.003",
    query: "raw_log::text ~* '(wmic|WMI|win32_process|EventFilter|CommandLineEventConsumer)'",
    severity: "high",
    last_run: null,
    last_findings: 0,
    active: true
  },
  outside_hours_logins: {
    id: "outside_hours_logins",
    name: "Outside Business Hours Login",
    description: "Detection of user logins outside of standard business hours.",
    mitre_tactic: "Initial Access",
    mitre_technique: "T1078",
    query: "alert_type ~* '(login|auth|authentication)'", // Cross-ref logic in engine
    severity: "medium",
    last_run: null,
    last_findings: 0,
    active: true
  }
};
