Task: Build complete Playbook Engine with all 4 playbooks for PhishSlayer SOC platform

Read ONLY these files:
lib/soc/types.ts
lib/soc/playbooks/engine.ts
lib/soc/playbooks/phishing.ts

Do not read any other file.

Requirements:

1. Update lib/soc/types.ts to add these types:

PlaybookStep with fields: id string, name string, description string,
action async function taking PlaybookContext returning StepResult,
rollback optional async function taking PlaybookContext returning void,
timeout_ms number default 30000, required boolean default true

StepResult with fields: success boolean, output jsonb or null,
error string or null, duration_ms number

PlaybookContext with fields: case_id string, alert RawAlert,
iocs IOC array, org_id string, analyst_id string or null,
wazuh_agent_id string or null, previous_steps Record of string to StepResult

PlaybookResult with fields: playbook_id string, case_id string,
success boolean, steps_executed number, steps_failed number,
total_duration_ms number, step_results Record of string to StepResult,
escalate_to_l3 boolean, escalation_reason string or null

IOC with fields: type ip or domain or hash or email or url,
value string, malicious boolean or null, confidence number or null,
source string or null

2. Rewrite lib/soc/playbooks/engine.ts with PlaybookEngine class:

Constructor takes supabase client from @/lib/supabase/server

Method executePlaybook taking playbook_id string and context PlaybookContext:
Fetch playbook steps from registered playbooks map
Execute each step in sequence with timeout enforcement using Promise.race
On step failure: log error to case_timeline, continue if required is false, abort if required is true
Log every step result to case_timeline via Supabase insert with actor system
Update case status to investigating on start
Update case status to contained on full success
Set escalate_to_l3 true if any critical step fails
Return PlaybookResult

Method registerPlaybook taking id string and steps PlaybookStep array:
Add to internal playbooks Map

Private method logToTimeline taking case_id string, action string, details jsonb:
Insert into case_timeline table with actor system and created_at now

Private method enforceTimeout taking promise and ms number:
Return Promise.race of promise and timeout rejection

3. Create lib/soc/playbooks/phishing.ts:
Phishing playbook with these steps in order:
Step 1 extract_iocs: Parse alert raw_log and extract all IPs, domains, email addresses, URLs
Use regex patterns for each IOC type
Step 2 enrich_iocs: Call enrichIOC from lib/soc/enrichment/index.ts for each extracted IOC
Step 3 block_sender: If malicious email found call /api/response/isolate with source_ip
Step 4 notify_users: Log notification action to case timeline — actual email via future integration
Step 5 create_report: Update case with all findings, set status to contained if no escalation needed

4. Create lib/soc/playbooks/malware.ts:
Malware playbook steps in order:
Step 1 isolate_host: POST to /api/response/isolate with wazuh_agent_id from context
Step 2 kill_process: POST to /api/response/kill-process with PID from alert raw_log
Step 3 quarantine_file: POST to /api/response/quarantine with file path from alert raw_log
Step 4 scan_for_spread: Query Supabase for other alerts with same rule_id in last 24 hours
Step 5 create_report: Summarize all actions taken, update case status

5. Create lib/soc/playbooks/bruteforce.ts:
Brute force playbook steps in order:
Step 1 block_ip: POST to /api/response/isolate with source_ip
Step 2 check_successful_logins: Query alert raw_log for any successful auth after brute force
Step 3 disable_account: Log disable action to timeline — wire to Microsoft Graph in Phase 2
Step 4 notify_user: Log notification to timeline with affected username from raw_log
Step 5 create_report: Set escalate_to_l3 true if successful login was found in step 2

6. Create lib/soc/playbooks/exfiltration.ts:
Exfiltration playbook steps in order:
Step 1 isolate_host: POST to /api/response/isolate with wazuh_agent_id — mark required true
Step 2 revoke_tokens: Log token revocation to timeline — wire to Microsoft Graph in Phase 2
Step 3 preserve_logs: Copy raw_log and all context to case_evidence table in Supabase
Step 4 escalate: Set escalate_to_l3 true always — exfiltration always escalates
Step 5 create_report: Update case severity to P1, update sla_deadline to 15 minutes from now

7. Update lib/soc/playbooks/engine.ts to register all 4 playbooks in constructor:
Register phishing, malware, brute_force, exfiltration playbooks

Run npm run build, fix all errors.
Commit: feat: complete playbook engine with all 4 playbooks, push.