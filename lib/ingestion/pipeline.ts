import { SupabaseClient } from "@supabase/supabase-js";
import { RawLogEntry, LogIngestionStats, RawAlert } from "../soc/types";
import { autoDetectAndNormalize } from "./normalizer";
import { v4 as uuidv4 } from "uuid";

export class IngestionPipeline {
  private supabase: SupabaseClient;

  constructor(supabase: SupabaseClient) {
    this.supabase = supabase;
  }

  public async ingestLog(
    raw_content: string, 
    source_type: string, 
    org_id: string, 
    source_ip: string | null = null
  ): Promise<RawLogEntry> {
    const normalized = autoDetectAndNormalize(raw_content);
    const id = uuidv4();

    const entry: RawLogEntry = {
      id,
      source_type: source_type as any,
      source_ip,
      raw_content,
      parsed_fields: normalized.extra_fields,
      ingested_at: new Date(),
      normalized,
      org_id
    };

    // 1. Store in raw_logs
    await this.supabase.from("raw_logs").insert({
      id: entry.id,
      org_id: entry.org_id,
      source_type: entry.source_type,
      source_ip: entry.source_ip,
      raw_content: entry.raw_content,
      parsed_fields: entry.parsed_fields,
      normalized: entry.normalized,
      ingested_at: entry.ingested_at.toISOString(),
      processed: true
    });

    // 2. High severity detection -> Auto-create alert
    if (normalized.severity > 8) {
      await this.supabase.from("alerts").insert({
        id: uuidv4(),
        org_id: entry.org_id,
        rule_id: entry.normalized?.raw_event_id || "high_severity_log",
        rule_description: `High severity log detected from ${entry.source_type}: ${normalized.action}`,
        source_ip: entry.source_ip,
        severity_level: normalized.severity,
        timestamp: entry.ingested_at.toISOString(),
        raw_log: entry.normalized,
        alert_type: "high_severity_event",
        agent_id: entry.normalized?.hostname || null,
        title: `Security Alert: ${normalized.action}`
      });

      await this.supabase.from("raw_logs").update({ alert_created: true }).eq("id", entry.id);
    }

    return entry;
  }

  public async ingestBatch(entries: any[], org_id: string): Promise<LogIngestionStats> {
    const startTime = Date.now();
    let parsedCount = 0;
    let failedCount = 0;
    const breakdown: Record<string, number> = {};

    const results = await Promise.allSettled(entries.map(e => 
      this.ingestLog(e.raw_content, e.source_type, org_id, e.source_ip)
    ));

    results.forEach((res, i) => {
      const type = entries[i].source_type;
      breakdown[type] = (breakdown[type] || 0) + 1;
      if (res.status === "fulfilled") parsedCount++;
      else failedCount++;
    });

    return {
      total_received: entries.length,
      total_parsed: parsedCount,
      total_failed: failedCount,
      sources_breakdown: breakdown,
      avg_parse_time_ms: (Date.now() - startTime) / (entries.length || 1),
      last_ingested_at: new Date()
    };
  }

  /**
   * Stub for Email Ingestion
   */
  public async ingestEmail(config: any): Promise<number> {
    console.info(`[ingestion] IMAP sync triggered for ${config.user} - Node-IMAP integration pending environment installation`);
    // Mock processing 1 email if triggered manually for UI testing
    return 0;
  }

  /**
   * Stub for CloudTrail Ingestion
   */
  public async ingestCloudTrail(s3_bucket: string, prefix: string): Promise<number> {
    console.info(`[ingestion] CloudTrail ingestion from ${s3_bucket}/${prefix} - AWS SDK integration pending`);
    return 0;
  }
}
