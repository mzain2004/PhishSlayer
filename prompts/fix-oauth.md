Task: Build complete Sigma Rule Auto-Generator for PhishSlayer SOC platform

Read ONLY these files:
lib/soc/hunting/engine.ts
lib/soc/hunting/hypotheses.ts
lib/soc/types.ts

Do not read any other file.

Requirements:

1. Update lib/soc/types.ts to add these types:

SigmaRule with fields: id string, title string, description string,
status enum experimental or test or stable, level enum low or medium or high or critical,
logsource SigmaLogsource, detection SigmaDetection, falsepositives string array,
tags string array of MITRE tags like attack.t1059, author string default PhishSlayer,
created_at Date, hunt_finding_id string or null, tested boolean, deployed boolean,
wazuh_rule_id string or null

SigmaLogsource with fields: category string, product string, service string or null

SigmaDetection with fields: selection jsonb, condition string,
timeframe string or null like 15m or 1h

SigmaGenerationResult with fields: rule SigmaRule, yaml_content string,
test_result SigmaTestResult or null, deployed boolean, wazuh_rule_id string or null

SigmaTestResult with fields: matched_alerts number, false_positive_rate number,
test_duration_ms number, sample_matches jsonb array, approved boolean

2. Create lib/soc/sigma/generator.ts with SigmaGenerator class:

Constructor takes supabase client

Method generateFromFinding taking finding HuntFinding returning SigmaGenerationResult:

Step 1 build detection logic:
Analyze finding.evidence jsonb to extract key indicators
Extract process names, command patterns, file paths, registry keys, network indicators
Build selection object mapping fieldnames to indicator values
Example: if evidence contains powershell and encodedcommand
Selection becomes: CommandLine contains powershell and contains encodedcommand

Step 2 determine logsource:
If finding.mitre_tactic contains Execution or Defense Evasion set category process_creation
If finding.mitre_tactic contains Network or Exfiltration set category network_connection
If finding.mitre_tactic contains Persistence set category registry_event
Otherwise default to category process_creation with product windows

Step 3 build complete SigmaRule object:
Title: Auto-Generated: {finding.title}
Description: {finding.description}
Status: experimental always for auto-generated rules
Level: map finding severity — critical to critical, high to high, medium to medium
Tags: array with attack.{finding.mitre_technique.toLowerCase()} and
attack.{finding.mitre_tactic.toLowerCase().replace space with underscore}
Author: PhishSlayer AutoGen
Falsepositives: array with legitimate administrative activity and authorized security tools

Step 4 convert to YAML string:
Generate valid Sigma YAML format:
title field, id field as uuid, status field, description field,
logsource block with category and product,
detection block with selection and condition: selection,
falsepositives list, level field, tags list
Use proper YAML indentation — 4 spaces for nested fields
Wrap string values containing special characters in quotes

Step 5 insert into sigma_rules table:
Store rule object and yaml_content
Set tested false and deployed false initially
Link to hunt_finding_id

Return SigmaGenerationResult with rule and yaml_content

Method testRule taking rule SigmaRule returning SigmaTestResult:

Query alerts table from last 7 days
Apply detection selection conditions against raw_log jsonb field
Use Supabase contains operator for jsonb matching
Count matching alerts as matched_alerts
Sample up to 5 matching alerts as sample_matches

Calculate false_positive_rate:
Query suppression_rules and feedback_entries for same indicators
If known FP indicators match more than 30 percent of results set approved false
Otherwise set approved true if matched_alerts is less than 1000

Update sigma_rules table: set tested true, test results in evidence jsonb
Return SigmaTestResult

Method deployToWazuh taking rule SigmaRule returning string wazuh_rule_id:

Convert Sigma rule to Wazuh XML format:
Build XML string with group name PhishSlayer_AutoGen
Rule id: generate numeric ID starting from 200000 incremented per rule
Level: map critical to 15, high to 12, medium to 8, low to 5
Description from rule title
Match on full_log field using regex patterns extracted from selection
Add mitre tags using mitre block with id tags

POST converted XML to Wazuh Manager API:
URL: http://167.172.85.62:55000/rules — auth via WAZUH_API_USER and WAZUH_API_PASSWORD
If Wazuh API unavailable: save rule locally in sigma_rules table with deployed false
Log error but do not throw — deployment failure is non-critical

Update sigma_rules table: set deployed true, wazuh_rule_id
Return wazuh_rule_id string

Method generateAndDeploy taking finding HuntFinding returning SigmaGenerationResult:
Call generateFromFinding then testRule then if approved call deployToWazuh
Return complete SigmaGenerationResult with all fields populated

Method getPendingRules returning SigmaRule array:
Query sigma_rules where tested false or deployed false
Return array for manual review

3. Update lib/soc/hunting/engine.ts:
Import SigmaGenerator from lib/soc/sigma/generator
After runHunt completes and findings exist:
For each finding with severity critical or high:
Call sigmaGenerator.generateAndDeploy with the finding
Update hunt_missions sigma_rule_generated to true
Log: Sigma rule generated and deployed for finding {finding.title}

4. Update supabase sigma_rules table — add missing columns if table exists:
Create supabase/migrations/20260424000006_sigma.sql:
ALTER TABLE public.sigma_rules ADD COLUMN IF NOT EXISTS hunt_finding_id UUID;
ALTER TABLE public.sigma_rules ADD COLUMN IF NOT EXISTS yaml_content TEXT;
ALTER TABLE public.sigma_rules ADD COLUMN IF NOT EXISTS tested BOOLEAN DEFAULT false;
ALTER TABLE public.sigma_rules ADD COLUMN IF NOT EXISTS deployed BOOLEAN DEFAULT false;
ALTER TABLE public.sigma_rules ADD COLUMN IF NOT EXISTS wazuh_rule_id TEXT;
ALTER TABLE public.sigma_rules ADD COLUMN IF NOT EXISTS test_results JSONB;
ALTER TABLE public.sigma_rules ADD COLUMN IF NOT EXISTS author TEXT DEFAULT PhishSlayer;

5. Create app/api/sigma/route.ts:
GET endpoint returning all sigma rules with tested and deployed status
Auth required, add dynamic and runtime exports

6. Create app/api/sigma/[id]/deploy/route.ts:
POST endpoint to manually trigger deployment of a specific rule to Wazuh
Auth required
Call sigmaGenerator.deployToWazuh with rule fetched from sigma_rules table
Return deployment result with wazuh_rule_id
Add dynamic and runtime exports

Run npm run build, fix all errors.
Commit: feat: complete Sigma rule auto-generator with Wazuh deployment, push.