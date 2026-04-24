import { SupabaseClient } from "@supabase/supabase-js";
import { RawLogEntry, LogIngestionStats, RawAlert } from "../soc/types";
import { autoDetectAndNormalize } from "./normalizer";
import { v4 as uuidv4 } from "uuid";
import Imap from "node-imap";
import { simpleParser } from "mailparser";
import { AutonomousOrchestrator } from "../soc/orchestrator";

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
      parsed_fields: normalized,
      ingested_at: new Date(),
      normalized,
      org_id
    };

    // 1. Insert into raw_logs
    await this.supabase.from("raw_logs").insert({
      id: entry.id,
      org_id: entry.org_id,
      source_type: entry.source_type,
      source_ip: entry.source_ip,
      raw_content: entry.raw_content,
      parsed_fields: entry.normalized,
      normalized: entry.normalized,
      processed: false,
      alert_created: false
    });

    // 2. High severity detection -> Alert
    if (normalized.severity > 8) {
      const severityMap: Record<number, string> = {
        9: "p3", 10: "p3", 11: "p2", 12: "p2", 13: "p1", 14: "p1", 15: "p1"
      };
      
      const { data: alertData, error: alertError } = await this.supabase.from("alerts").insert({
        org_id: entry.org_id,
        alert_type: normalized.category,
        severity_level: normalized.severity,
        source_ip: entry.source_ip,
        raw_log: normalized,
        status: "open",
        title: `Auto-Alert: ${normalized.action}`
      }).select("id").single();

      if (!alertError && alertData?.id) {
        await this.supabase.from("raw_logs").update({
          processed: true,
          alert_created: true
        }).eq("id", entry.id);

        // 3. Trigger Autonomous Orchestrator (Async)
        const orchestrator = new AutonomousOrchestrator(this.supabase);
        void orchestrator.processAlert(alertData.id, entry.org_id);
      }
    }

    return entry;
  }

  public async ingestBatch(entries: any[], org_id: string): Promise<LogIngestionStats> {
    const startTime = Date.now();
    let totalParsed = 0;
    let totalFailed = 0;
    const sourcesBreakdown: Record<string, number> = {};

    const results = await Promise.allSettled(entries.map(e => 
      this.ingestLog(e.raw_content, e.source_type, org_id, e.source_ip)
    ));

    results.forEach((res, i) => {
      const type = entries[i].source_type;
      sourcesBreakdown[type] = (sourcesBreakdown[type] || 0) + 1;
      if (res.status === "fulfilled") totalParsed++;
      else totalFailed++;
    });

    return {
      total_received: entries.length,
      total_parsed: totalParsed,
      total_failed: totalFailed,
      sources_breakdown: sourcesBreakdown,
      avg_parse_time_ms: (Date.now() - startTime) / (entries.length || 1),
      last_ingested_at: new Date()
    };
  }

  public async ingestEmail(): Promise<number> {
    const config: any = {
      user: process.env.IMAP_USER,
      password: process.env.IMAP_PASSWORD,
      host: process.env.IMAP_HOST,
      port: parseInt(process.env.IMAP_PORT || "993"),
      tls: (process.env.IMAP_PORT || "993") === "993"
    };

    if (!config.user || !config.password || !config.host) {
      console.warn("[ingestion] IMAP not configured — skipping");
      return 0;
    }

    return new Promise((resolve) => {
      const imap = new Imap(config);
      let count = 0;

      imap.once("ready", () => {
        imap.openBox("INBOX", false, (err) => {
          if (err) { resolve(0); return; }
          imap.search(["UNSEEN"], (err, results) => {
            if (err || !results.length) { imap.end(); resolve(0); return; }
            
            const f = imap.fetch(results, { bodies: "" });
            f.on("message", (msg) => {
              msg.on("body", (stream) => {
                simpleParser(stream as any, async (err, parsed) => {
                  if (err) return;
                  const raw_content = `From: ${parsed?.from?.text} Subject: ${parsed?.subject} Body: ${parsed?.text?.slice(0, 500)}`;
                  await this.ingestLog(raw_content, "email", "system");
                  count++;
                });
              });
              msg.once("attributes", (attrs) => {
                imap.addFlags(attrs.uid, ["\\Seen"], () => {});
              });
            });
            f.once("end", () => {
              imap.end();
              resolve(count);
            });
          });
        });
      });

      imap.once("error", (err: any) => {
        console.error("[imap] error:", err);
        resolve(count);
      });

      imap.connect();
    });
  }

  public async getStats(org_id: string): Promise<LogIngestionStats> {
    const twentyFourHoursAgo = new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString();
    const { data: logs } = await this.supabase
      .from("raw_logs")
      .select("source_type")
      .eq("org_id", org_id)
      .gte("ingested_at", twentyFourHoursAgo);

    const breakdown: Record<string, number> = {};
    logs?.forEach(l => {
      breakdown[l.source_type] = (breakdown[l.source_type] || 0) + 1;
    });

    return {
      total_received: logs?.length || 0,
      total_parsed: logs?.length || 0, // Simplified
      total_failed: 0,
      sources_breakdown: breakdown,
      avg_parse_time_ms: 0,
      last_ingested_at: new Date()
    };
  }
}
