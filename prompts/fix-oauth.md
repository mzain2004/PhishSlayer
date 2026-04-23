Task: Create Supabase migration for case management

Create file: supabase/migrations/20260424000001_cases.sql

Tables needed:
cases: id uuid primary key, org_id text, title text, severity text p1/p2/p3/p4, status text open/investigating/contained/closed, alert_type text, source_ip text, affected_asset text, mitre_tactic text, mitre_technique text, sla_deadline timestamptz, created_at timestamptz default now(), updated_at timestamptz, closed_at timestamptz
case_timeline: id uuid primary key, case_id uuid references cases, action text, actor text, details jsonb, created_at timestamptz default now()
case_evidence: id uuid primary key, case_id uuid references cases, evidence_type text, content jsonb, created_at timestamptz default now()
ioc_store: id uuid primary key, case_id uuid references cases, ioc_type text, value text, enrichment jsonb, malicious bool, confidence_score int, first_seen timestamptz, last_seen timestamptz

Add RLS: auth.jwt() ->> sub as user_id pattern same as existing policies

Do not touch any other file.
Commit: feat: case management schema and push.