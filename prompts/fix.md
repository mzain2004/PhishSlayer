Before starting, list every file you will create. 
Create one file at a time. After each file say "FILE DONE" then continue.
Do not stop until all files complete.

You are building features for PhishSlayer, an agentic SOC platform.
Stack: Next.js 15, TypeScript, Supabase, Clerk, Groq, MongoDB Atlas.

CRITICAL RULES:
- Never stop for missing dependencies — install what is needed or mock
- Never hallucinate libraries — if unsure, implement logic manually in TypeScript
- If a subtask has an error, fix it and continue — never abandon the task
- Complete everything. Run npm run build at the end, fix ALL errors.

BUILD TASK 1 — User Behavior Analytics (UBA):
1. Create lib/uba/baseline.ts
   - Build behavioral baseline per user from alerts + events tables
   - Track: login times, source IPs, endpoints accessed, alert frequency
   - Store baseline in MongoDB collection: uba_baselines
   - Schema: { userId, orgId, avgLoginHour, commonIPs[], commonEndpoints[], 
               alertFrequency, lastUpdated }

2. Create lib/uba/anomalyDetector.ts
   - Compare current activity against baseline
   - Anomaly rules:
     a) Login outside normal hours (>2 std dev from baseline)
     b) New IP not seen in last 30 days
     c) Alert spike (>3x baseline frequency in 1 hour)
     d) Impossible travel (2 IPs >500km apart within 1 hour, use geoip lib)
     e) Privilege escalation pattern (role change + immediate API access)
   - Score each anomaly 1-100
   - Return: { anomalies[], riskScore, userId, triggeredRules[] }

3. Create lib/uba/profileBuilder.ts
   - Aggregate user risk profile across all anomalies
   - Risk levels: LOW <30, MEDIUM 30-60, HIGH 60-80, CRITICAL >80
   - Store in Supabase:

4. Create Supabase migration 20260428300000_uba.sql:
   CREATE TABLE user_risk_profiles (
     id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
     organization_id UUID REFERENCES organizations(id),
     user_id TEXT NOT NULL,
     risk_score INTEGER DEFAULT 0,
     risk_level TEXT DEFAULT 'LOW',
     anomalies JSONB DEFAULT '[]',
     triggered_rules TEXT[],
     last_anomaly_at TIMESTAMPTZ,
     updated_at TIMESTAMPTZ DEFAULT NOW()
   );
   CREATE TABLE uba_anomaly_events (
     id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
     organization_id UUID REFERENCES organizations(id),
     user_id TEXT NOT NULL,
     anomaly_type TEXT,
     details JSONB,
     risk_score INTEGER,
     created_at TIMESTAMPTZ DEFAULT NOW()
   );
   Enable RLS on both. Org-scoped select policies.

5. Create app/api/uba/analyze/route.ts
   - POST { userId, organizationId, currentActivity }
   - Run anomalyDetector → update profileBuilder → save anomaly event
   - Return risk profile

6. Create app/api/uba/profiles/route.ts
   - GET: return all user_risk_profiles for org, ordered by risk_score DESC

7. Create app/api/cron/uba-baseline-update/route.ts
   - Rebuild baselines for all active users in all orgs
   - Run daily

BUILD TASK 2 — Custom Sigma/YARA Rule Builder:
1. Create lib/detection/sigmaParser.ts
   - Parse Sigma rule YAML format into structured object
   - Fields: title, status, description, logsource, detection, condition, level
   - Validate rule structure
   - Convert Sigma detection to SQL WHERE clause for alerts table query

2. Create lib/detection/sigmaEngine.ts
   - Load all active rules for an org
   - Run rules against incoming alert data
   - Return: { matchedRules[], alertId, triggeredAt }

3. Create lib/detection/yaraScanner.ts
   - Store YARA rules as text in DB
   - For file/content scanning: use simple string/regex pattern matching as fallback
    (real YARA binary not available in Docker — implement text pattern matching)
   - Match against alert evidence JSONB field

4. Create Supabase migration 20260428400000_detection_rules.sql:
   CREATE TABLE detection_rules (
     id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
     organization_id UUID REFERENCES organizations(id),
     name TEXT NOT NULL,
     type TEXT NOT NULL CHECK (type IN ('sigma', 'yara', 'custom')),
     rule_content TEXT NOT NULL,
     parsed_rule JSONB,
     is_active BOOLEAN DEFAULT true,
     severity TEXT DEFAULT 'medium',
     mitre_technique TEXT,
     hit_count INTEGER DEFAULT 0,
     last_hit_at TIMESTAMPTZ,
     created_by TEXT,
     created_at TIMESTAMPTZ DEFAULT NOW()
   );
   Enable RLS. Org-scoped policies for select/insert/update.

5. Create app/api/detection-rules/route.ts
   - GET: list rules for org
   - POST: create new rule (auto-parse sigma YAML on save)

6. Create app/api/detection-rules/[id]/route.ts
   - GET, PUT, DELETE

7. Create app/api/detection-rules/[id]/test/route.ts
   - POST { sampleAlert }
   - Run rule against sample, return match result

8. Create app/api/detection-rules/validate/route.ts
   - POST { ruleContent, type }
   - Validate syntax, return errors or parsed structure

9. Create app/api/cron/run-detection-rules/route.ts
   - Run all active Sigma rules against last 1hr of alerts
   - Create new alert if rule matches

Run npm run build. Fix all errors. List every file created.