Task: Build complete Log Ingestion Pipeline for PhishSlayer SOC platform

Read ONLY these files:
lib/soc/types.ts
lib/soc/deduplication.ts
app/api/cases/route.ts

Do not read any other file.

Requirements:

1. Update lib/soc/types.ts to add these types:

RawLogEntry with fields: id string, source_type enum syslog or cef or leef or
json or email or cloudtrail or azure_activity, source_ip string or null,
raw_content string, parsed_fields jsonb, ingested_at Date,
normalized NormalizedLog or null, org_id string

NormalizedLog with fields: timestamp Date, source_ip string or null,
destination_ip string or null, user string or null, hostname string or null,
action string, outcome enum success or failure or unknown,
severity number 1-15, category string, raw_event_id string or null,
mitre_tactic string or null, mitre_technique string or null,
extra_fields jsonb

LogIngestionStats with fields: total_received number, total_parsed number,
total_failed number, sources_breakdown Record of string to number,
avg_parse_time_ms number, last_ingested_at Date or null

CEFEvent with fields: version string, device_vendor string, device_product string,
device_version string, signature_id string, name string, severity string,
extensions Record of string to string

2. Create lib/ingestion/normalizer.ts:

Function normalizeSyslog taking raw string returning NormalizedLog:
Parse RFC 5424 syslog format: priority facility severity timestamp hostname app_name msg
Extract PRI value and calculate facility as Math.floor(pri/8) and severity as pri mod 8
Extract timestamp — handle both RFC 3164 and RFC 5424 formats
Extract hostname, app_name, process_id, message
Map syslog severity 0-7 to our 1-15 scale: multiply by 2 plus 1
Return NormalizedLog with all extracted fields

Function normalizeCEF taking raw string returning NormalizedLog:
Parse CEF:0|vendor|product|version|sig_id|name|severity|extensions format
Split on pipe character — first 7 fields are header
Parse extensions as key=value pairs handling spaces in values
Map CEF severity 0-10 to our 1-15 scale
Extract src, dst, suser, duser, act fields from extensions
Return NormalizedLog

Function normalizeLEEF taking raw string returning NormalizedLog:
Parse LEEF:2.0|vendor|product|version|eventid|attrs format
Split on pipe for header, parse tab-separated attributes
Extract src, dst, usrName, proto, devTime fields
Return NormalizedLog

Function normalizeJSON taking raw string returning NormalizedLog:
Parse JSON safely with try catch
Handle common JSON log formats from different sources
Look for timestamp fields: timestamp, time, @timestamp, eventTime, TimeGenerated
Look for IP fields: src, source, sourceIP, source_ip, remoteIP
Look for user fields: user, username, userId, actor
Return NormalizedLog with best-effort field mapping

Function normalizeCloudTrail taking raw string returning NormalizedLog:
Parse AWS CloudTrail event JSON format
Extract: eventTime, sourceIPAddress, userIdentity.userName or userIdentity.arn,
eventName, errorCode, awsRegion, requestParameters
Map errorCode present to outcome failure otherwise success
Set category to cloudtrail
Return NormalizedLog

Function normalizeAzureActivity taking raw string returning NormalizedLog:
Parse Azure Activity Log JSON format
Extract: eventTimestamp, callerIpAddress, caller, operationName.value,
resultType, resourceType, resourceGroup
Map resultType Failed to outcome failure otherwise success
Set category to azure_activity
Return NormalizedLog

Function autoDetectAndNormalize taking raw string returning NormalizedLog:
Check if starts with CEF:0 — call normalizeCEF
Check if starts with LEEF: — call normalizeLEEF
Check if starts with less-than symbol and contains syslog PRI pattern — call normalizeSyslog
Check if valid JSON — call normalizeJSON
Otherwise call normalizeSyslog as fallback
Return NormalizedLog

3. Create lib/ingestion/pipeline.ts with IngestionPipeline class:

Constructor takes supabase client

Method ingestLog taking raw_content string and source_type string and org_id string and source_ip string returning RawLogEntry:
Call autoDetectAndNormalize from normalizer.ts
Insert into raw_logs table with parsed_fields and normalized data
Check deduplication: call deduplicateAlerts if normalized severity above 8
If high severity: auto-create alert in alerts table
Return RawLogEntry

Method ingestBatch taking entries RawLogEntry array returning LogIngestionStats:
Process all entries using Promise.allSettled for parallel ingestion
Track success and failure counts
Return LogIngestionStats

Method ingestEmail taking imap_config object returning number count:
Use node-imap package to connect to IMAP server
Config fields: host, port, user, password, tls boolean all from env:
IMAP_HOST, IMAP_PORT, IMAP_USER, IMAP_PASSWORD
Search UNSEEN emails in INBOX
For each email: extract subject, from, body, attachments list
Parse for phishing indicators: suspicious links, spoofed domains, malicious attachments
Create RawLogEntry with source_type email
Mark email as seen after processing
Return count of processed emails

Method ingestCloudTrail taking s3_bucket string and prefix string returning number:
Note: actual S3 fetch requires AWS SDK — create stub implementation
Log: CloudTrail ingestion from {s3_bucket}/{prefix} — AWS SDK integration pending
Create placeholder RawLogEntry with source_type cloudtrail
Return 0 as stub — full implementation requires AWS_ACCESS_KEY_ID in env

4. Create app/api/ingest/route.ts:
POST endpoint accepting single log entry
Body: raw_content string, source_type string, org_id string
Auth: validate INGEST_API_KEY from request header x-api-key against process.env.INGEST_API_KEY
Do NOT use Clerk auth here — this endpoint is called by external systems not browsers
Zod validation on payload
Call pipeline.ingestLog and return RawLogEntry
Add dynamic and runtime exports

5. Create app/api/ingest/batch/route.ts:
POST endpoint accepting array of log entries up to 1000 per request
Header auth via INGEST_API_KEY same as above
Zod validation: array max 1000 items
Call pipeline.ingestBatch and return LogIngestionStats
Add dynamic and runtime exports

6. Create app/api/ingest/email/route.ts:
POST endpoint to trigger IMAP email ingestion manually
Clerk auth required — this is triggered by analyst or cron
Call pipeline.ingestEmail with env config
Return count of processed emails
Add dynamic and runtime exports

7. Create supabase/migrations/20260424000009_ingestion.sql:

CREATE TABLE IF NOT EXISTS public.raw_logs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  org_id TEXT NOT NULL,
  source_type TEXT NOT NULL,
  source_ip TEXT,
  raw_content TEXT NOT NULL,
  parsed_fields JSONB DEFAULT '{}'::jsonb,
  normalized JSONB DEFAULT '{}'::jsonb,
  ingested_at TIMESTAMPTZ DEFAULT now(),
  processed BOOLEAN DEFAULT false,
  alert_created BOOLEAN DEFAULT false
);

CREATE INDEX IF NOT EXISTS idx_raw_logs_org_id ON public.raw_logs(org_id);
CREATE INDEX IF NOT EXISTS idx_raw_logs_source_type ON public.raw_logs(source_type);
CREATE INDEX IF NOT EXISTS idx_raw_logs_ingested_at ON public.raw_logs(ingested_at DESC);
CREATE INDEX IF NOT EXISTS idx_raw_logs_processed ON public.raw_logs(processed);

ALTER TABLE public.raw_logs ENABLE ROW LEVEL SECURITY;

DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename = 'raw_logs'
  AND policyname = 'raw_logs_policy') THEN
    CREATE POLICY "raw_logs_policy" ON public.raw_logs
    USING (auth.jwt() IS NOT NULL);
  END IF;
END $$;

8. Update cron route to trigger email ingestion daily at 00:00 UTC:
Add call to pipeline.ingestEmail before intel sync
This ensures phishing emails are ingested first then intel syncs then hunts run

Run npm run build, fix all errors.
Commit: feat: complete log ingestion pipeline syslog CEF LEEF JSON email cloudtrail, push.