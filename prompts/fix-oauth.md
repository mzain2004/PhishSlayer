Task: Build complete Hunt Mission Scheduler for PhishSlayer SOC platform

Read ONLY these files:
lib/soc/types.ts
lib/soc/ueba.ts
lib/soc/deduplication.ts

Do not read any other file.

Requirements:

1. Update lib/soc/types.ts to add these types:

HuntHypothesis with fields: id string, name string, description string,
mitre_tactic string, mitre_technique string, query string,
severity enum low or medium or high or critical,
last_run Date or null, last_findings number, active boolean

HuntMission with fields: id string, hypothesis_id string, hypothesis_name string,
status enum scheduled or running or completed or failed,
started_at Date or null, completed_at Date or null,
findings HuntFinding array, alerts_scanned number,
sigma_rule_generated boolean, org_id string

HuntFinding with fields: id string, mission_id string, hypothesis_id string,
title string, description string, severity string, evidence jsonb,
affected_assets string array, mitre_tactic string, mitre_technique string,
recommended_action string, created_at Date, case_id string or null

2. Create lib/soc/hunting/hypotheses.ts with all 10 core hypotheses:

Hypothesis 1 powershell_abuse:
name: PowerShell Abuse Detection
mitre_tactic: Execution, mitre_technique: T1059.001
Query alerts table where raw_log contains powershell or encoded command or
bypass or downloadstring or invoke-expression or IEX
Severity critical

Hypothesis 2 impossible_travel:
name: Impossible Travel Detection
mitre_tactic: Initial Access, mitre_technique: T1078
Query alerts table for same user_id with different source_ip countries
within 2 hour window — join with ueba_anomalies where anomaly_type is impossible_travel
Severity critical

Hypothesis 3 pass_the_hash:
name: Pass-the-Hash Attack
mitre_tactic: Lateral Movement, mitre_technique: T1550.002
Query alerts where raw_log contains NTLM or pass-the-hash or pth or
mimikatz or sekurlsa or lsass
Severity critical

Hypothesis 4 data_staging:
name: Data Staging Detection
mitre_tactic: Collection, mitre_technique: T1074
Query alerts where raw_log contains temp or staging or compress or
zip or rar or 7zip and file size indicators
Severity high

Hypothesis 5 lolbins:
name: Living off the Land Binaries
mitre_tactic: Defense Evasion, mitre_technique: T1218
Query alerts where raw_log contains certutil or regsvr32 or mshta or
wscript or cscript or rundll32 or msiexec with suspicious arguments
Severity high

Hypothesis 6 new_admin_accounts:
name: New Admin Account Creation
mitre_tactic: Persistence, mitre_technique: T1136
Query alerts where raw_log contains useradd or net user or
new account or administrator or admin and created
Severity high

Hypothesis 7 large_file_transfers:
name: Abnormal Large File Transfer
mitre_tactic: Exfiltration, mitre_technique: T1041
Query alerts where raw_log contains bytes transferred or file size
Extract numeric value and flag if greater than 100MB meaning 104857600 bytes
Severity high

Hypothesis 8 disabled_security_tools:
name: Security Tool Tampering
mitre_tactic: Defense Evasion, mitre_technique: T1562
Query alerts where raw_log contains defender or antivirus or firewall or
wazuh or sysmon and stopped or disabled or killed or terminated
Severity critical

Hypothesis 9 wmi_persistence:
name: WMI Persistence Detection
mitre_tactic: Persistence, mitre_technique: T1546.003
Query alerts where raw_log contains wmic or WMI or
win32_process or EventFilter or CommandLineEventConsumer
Severity high

Hypothesis 10 outside_hours_logins:
name: Outside Business Hours Login
mitre_tactic: Initial Access, mitre_technique: T1078
Query alerts where alert_type contains login or auth or authentication
Extract timestamp hour and flag if hour less than 7 or greater than 19
Cross-reference with ueba_profiles baseline_login_hours
Severity medium

3. Create lib/soc/hunting/engine.ts with HuntEngine class:

Constructor takes supabase client

Method runHunt taking hypothesis_id string and org_id string returning HuntMission:
Insert new hunt_missions row with status running and started_at now
Load hypothesis from hypotheses map in hypotheses.ts
Execute hypothesis query against Supabase alerts table
For each result found: create HuntFinding and insert into hunt_findings table
If findings count greater than 0: set sigma_rule_generated flag true — actual generation in P15
Update hunt_missions row with status completed, completed_at, findings count
Log to console: Hunt {hypothesis_name} completed — {count} findings
Return completed HuntMission

Method runAllHunts taking org_id string returning HuntMission array:
Run all 10 hypotheses sequentially to avoid overwhelming Supabase
Return array of all HuntMission results

Method scheduleHunts taking org_id string returning void:
This method is called by cron-runner container daily at 02:00 UTC
Use node-cron syntax: 0 2 * * *
Call runAllHunts and log results
If any mission has findings count greater than 0 create a case via Supabase insert
Case title: Automated Hunt Finding: {hypothesis_name}
Case severity: match hypothesis severity — critical to p1, high to p2, medium to p3
Case alert_type: threat_hunt
Case status: open

Method getHuntHistory taking org_id string returning HuntMission array:
Query hunt_missions table ordered by started_at desc limit 50
Join with hunt_findings count per mission
Return results

4. Create supabase/migrations/20260424000005_hunting.sql:

Table hunt_missions: id uuid primary key, hypothesis_id text, hypothesis_name text,
status text default scheduled, org_id text, started_at timestamptz,
completed_at timestamptz, alerts_scanned integer default 0,
findings_count integer default 0, sigma_rule_generated boolean default false,
created_at timestamptz default now()

Table hunt_findings: id uuid primary key, mission_id uuid references hunt_missions,
hypothesis_id text, title text, description text, severity text,
evidence jsonb, affected_assets text array, mitre_tactic text,
mitre_technique text, recommended_action text,
case_id uuid, created_at timestamptz default now()

Add index on hunt_missions org_id and started_at
Add index on hunt_findings mission_id and severity
Add RLS policies using auth.jwt() ->> sub pattern same as existing tables

5. Create app/api/hunting/run/route.ts:
POST endpoint to trigger a single hunt by hypothesis_id
Auth: const userId from auth() from @clerk/nextjs/server
Zod validation: hypothesis_id must be one of the 10 valid hypothesis IDs
Call huntEngine.runHunt and return HuntMission result
Add dynamic and runtime exports

6. Create app/api/hunting/history/route.ts:
GET endpoint returning hunt history for org
Auth required, add dynamic and runtime exports

7. Update app/api/cron/route.ts if it exists or create it:
Add hunt scheduler trigger alongside existing cron jobs
Call huntEngine.scheduleHunts with system org_id
Protect with CRON_SECRET from env
Add dynamic and runtime exports

Run npm run build, fix all errors.
Commit: feat: complete hunt mission scheduler with 10 hypotheses, push.