Task: Build complete UEBA User Entity Behavior Analytics engine for PhishSlayer

Read ONLY these files:
lib/soc/types.ts
lib/soc/autoclose.ts
lib/soc/deduplication.ts

Do not read any other file.

Requirements:

1. Update lib/soc/types.ts to add these types:

UserBehaviorProfile with fields: user_id string, username string, org_id string,
baseline_login_hours number array 0-23 representing normal login hours,
baseline_locations string array of normal country codes,
baseline_devices string array of normal device fingerprints,
avg_daily_alerts number, risk_score number 0-100,
last_updated Date, anomalies UEBAAnomaly array

UEBAAnomaly with fields: id string, user_id string, anomaly_type enum
impossible_travel or off_hours_login or new_device or excessive_failed_logins
or privilege_escalation or mass_download or lateral_movement,
severity enum low or medium or high or critical,
description string, evidence jsonb, detected_at Date,
case_id string or null, suppressed boolean

EntityRiskScore with fields: entity_id string, entity_type enum user or host or ip,
score number 0-100, factors RiskFactor array, last_calculated Date, trend enum
increasing or decreasing or stable

RiskFactor with fields: name string, contribution number, description string

2. Create lib/soc/ueba.ts with UEBAEngine class:

Constructor takes supabase client

Method analyzeUserBehavior taking user_id string and alert RawAlert returning UEBAAnomaly array:

Check 1 impossible_travel:
Query last 5 alerts for this user_id from alerts table ordered by timestamp desc
If current alert source_ip country differs from previous alert country
AND time between alerts is less than 2 hours
Create UEBAAnomaly with anomaly_type impossible_travel and severity critical
Description: User logged in from {country1} and {country2} within {minutes} minutes

Check 2 off_hours_login:
Extract hour from alert timestamp
Query user baseline_login_hours from ueba_profiles table
If hour not in baseline_login_hours array and alert_type contains login or auth
Create UEBAAnomaly with anomaly_type off_hours_login and severity medium
If hour is between 0 and 5 set severity high

Check 3 excessive_failed_logins:
Query alerts table for same user_id and rule_id containing 5710 or 5712
Count alerts in last 15 minutes
If count greater than 10 create UEBAAnomaly with anomaly_type excessive_failed_logins
severity high, description: {count} failed logins in 15 minutes

Check 4 privilege_escalation:
Check if alert raw_log contains keywords: sudo, privilege, escalat, admin, root
If found create UEBAAnomaly with anomaly_type privilege_escalation severity critical

Return all detected anomalies array

Method calculateEntityRiskScore taking entity_id string and entity_type string returning EntityRiskScore:

Query last 30 days of alerts for this entity from alerts table
Query ueba_anomalies table for this entity last 30 days
Calculate score using these weights:
Critical anomaly in last 24h adds 40 points
High anomaly in last 24h adds 25 points
Medium anomaly in last 24h adds 10 points
Each unique anomaly_type in last 7 days adds 5 points
More than 100 alerts in last 24h adds 15 points
Cap final score at 100

Determine trend by comparing current score to score 7 days ago:
If difference greater than 10 set trend increasing
If difference less than -10 set trend decreasing
Otherwise stable

Return EntityRiskScore with all factors explained

Method updateUserProfile taking user_id string and alert RawAlert returning void:
Upsert into ueba_profiles table
Update baseline_login_hours by adding current hour if not present — max 24 entries
Update baseline_locations by adding current country — max 10 entries
Set last_updated to now

Method getHighRiskEntities taking org_id string returning EntityRiskScore array:
Query ueba_profiles where risk_score greater than 70
Return top 20 sorted by risk_score descending

3. Create supabase/migrations/20260424000004_ueba.sql:

Table ueba_profiles: id uuid primary key, user_id text unique, username text,
org_id text, baseline_login_hours integer array default array[]::integer[],
baseline_locations text array default array[]::text[],
baseline_devices text array default array[]::text[],
avg_daily_alerts numeric default 0, risk_score integer default 0,
last_updated timestamptz default now()

Table ueba_anomalies: id uuid primary key, user_id text, entity_id text,
entity_type text, anomaly_type text, severity text, description text,
evidence jsonb, detected_at timestamptz default now(),
case_id uuid, suppressed boolean default false

Add index on ueba_anomalies entity_id and detected_at for fast lookups
Add index on ueba_profiles risk_score for high risk queries
Add RLS policies using auth.jwt() ->> sub pattern same as existing tables

4. Create app/api/ueba/risk-scores/route.ts:
GET endpoint returning high risk entities for org
Auth: const userId from auth() from @clerk/nextjs/server
Call uebaEngine.getHighRiskEntities with org_id from query params
Add dynamic and runtime exports

5. Create app/api/ueba/anomalies/route.ts:
GET endpoint returning recent anomalies with optional user_id filter
POST endpoint to suppress an anomaly by id
Auth required on both
Zod validation on POST payload
Add dynamic and runtime exports

Run npm run build, fix all errors.
Commit: feat: complete UEBA engine with risk scoring and anomaly detection, push.