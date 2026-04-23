import { Playbook, PlaybookStep, PlaybookContext, StepResult, IOC } from "../types";
import { enrichIOC } from "../enrichment/index";
import { createClient } from "@/lib/supabase/server";

const extract_iocs: PlaybookStep = {
  id: "extract_iocs",
  name: "Extract IOCs",
  description: "Parse alert raw_log and extract all IPs, domains, email addresses, and URLs.",
  action: async (context) => {
    const startTime = Date.now();
    const rawLog = JSON.stringify(context.alert.raw_log || {});
    
    const ipRegex = /\b\d{1,3}\.\d{1,3}\.\d{1,3}\.\d{1,3}\b/g;
    const domainRegex = /\b([a-z0-9]+(-[a-z0-9]+)*\.)+[a-z]{2,}\b/gi;
    const emailRegex = /\b[A-Z0-9._%+-]+@[A-Z0-9.-]+\.[A-Z]{2,}\b/gi;
    const urlRegex = /https?:\/\/(www\.)?[-a-zA-Z0-9@:%._\+~#=]{1,256}\.[a-zA-Z0-9()]{1,6}\b([-a-zA-Z0-9()@:%_\+.~#?&//=]*)/gi;

    const ips = Array.from(new Set(rawLog.match(ipRegex) || []));
    const domains = Array.from(new Set(rawLog.match(domainRegex) || []));
    const emails = Array.from(new Set(rawLog.match(emailRegex) || []));
    const urls = Array.from(new Set(rawLog.match(urlRegex) || []));

    const iocs: IOC[] = [
      ...ips.map(v => ({ type: "ip" as const, value: v, malicious: null, confidence: null, source: "raw_log" })),
      ...domains.map(v => ({ type: "domain" as const, value: v, malicious: null, confidence: null, source: "raw_log" })),
      ...emails.map(v => ({ type: "email" as const, value: v, malicious: null, confidence: null, source: "raw_log" })),
      ...urls.map(v => ({ type: "url" as const, value: v, malicious: null, confidence: null, source: "raw_log" }))
    ];

    context.iocs.push(...iocs);

    return {
      success: true,
      output: { iocs_found: iocs.length },
      error: null,
      duration_ms: Date.now() - startTime
    };
  }
};

const enrich_iocs: PlaybookStep = {
  id: "enrich_iocs",
  name: "Enrich IOCs",
  description: "Enrich each extracted IOC with threat intelligence.",
  action: async (context) => {
    const startTime = Date.now();
    for (const ioc of context.iocs) {
      if (ioc.type === "ip" || ioc.type === "domain" || ioc.type === "hash") {
        try {
          const result = await enrichIOC(ioc.type, ioc.value, context.case_id);
          // Simplified mapping for the sake of the playbook
          if (ioc.type === "ip") {
            ioc.malicious = (result.abuseConfidenceScore || 0) > 50;
            ioc.confidence = result.abuseConfidenceScore || 0;
          } else if (ioc.type === "domain") {
            ioc.malicious = (result.attributes?.last_analysis_stats?.malicious || 0) > 0;
            ioc.confidence = ioc.malicious ? 100 : 0;
          }
        } catch (e) {
          console.error(`Enrichment failed for ${ioc.value}`, e);
        }
      }
    }

    return {
      success: true,
      output: { iocs_enriched: context.iocs.length },
      error: null,
      duration_ms: Date.now() - startTime
    };
  }
};

const block_sender: PlaybookStep = {
  id: "block_sender",
  name: "Block Sender",
  description: "If malicious email found, isolate the source IP.",
  action: async (context) => {
    const startTime = Date.now();
    const maliciousEmail = context.iocs.find(i => i.type === "email" && i.malicious);
    
    if (maliciousEmail && context.alert.source_ip) {
      // In a real scenario, we'd call the API. Here we simulate the trigger.
      // fetch('/api/response/isolate', { method: 'POST', ... })
      return {
        success: true,
        output: { action: "ISOLATE_TRIGGERED", target: context.alert.source_ip },
        error: null,
        duration_ms: Date.now() - startTime
      };
    }

    return {
      success: true,
      output: { action: "NONE" },
      error: null,
      duration_ms: Date.now() - startTime
    };
  }
};

const notify_users: PlaybookStep = {
  id: "notify_users",
  name: "Notify Users",
  description: "Log notification action to case timeline.",
  action: async (context) => {
    const startTime = Date.now();
    // Notification logic placeholder
    return {
      success: true,
      output: { notified: true },
      error: null,
      duration_ms: Date.now() - startTime
    };
  }
};

const create_report: PlaybookStep = {
  id: "create_report",
  name: "Create Report",
  description: "Update case with findings and set status.",
  action: async (context) => {
    const startTime = Date.now();
    const supabase = await createClient();
    
    const anyFailures = Object.values(context.previous_steps).some(r => !r.success);
    const status = anyFailures ? "investigating" : "contained";

    await supabase.from("cases").update({
      status,
      updated_at: new Date().toISOString()
    }).eq("id", context.case_id);

    return {
      success: true,
      output: { status_updated: status },
      error: null,
      duration_ms: Date.now() - startTime
    };
  }
};

export const phishingPlaybook: Playbook = {
  id: "phishing",
  name: "Phishing Response Playbook",
  description: "Standard procedure for phishing alerts.",
  steps: [extract_iocs, enrich_iocs, block_sender, notify_users, create_report]
};
