Task: Create alert deduplication engine

Create file lib/soc/deduplication.ts only
Function: deduplicateAlerts taking RawAlert array returning DeduplicatedCase array
Group by source_ip plus rule_id within 15 minute windows
Output: id, alerts, count, first_seen, last_seen, representative_alert
Also create lib/soc/types.ts with shared SOC types
Do not touch any other file.
Run npm run build, fix errors, commit: feat: alert deduplication engine, push.