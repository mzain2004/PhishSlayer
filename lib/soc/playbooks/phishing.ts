import { Playbook, PlaybookStep, PlaybookContext } from "./types";
import { createClient } from "@/lib/supabase/server";

async function logToTimeline(caseId: string, action: string, details: any) {
  const supabase = await createClient();
  await supabase.from("case_timeline").insert({
    case_id: caseId,
    action,
    actor: "system",
    details
  });
}

const extractIOCs: PlaybookStep = {
  id: "extract-iocs",
  name: "Extract IOCs",
  description: "Extracting URLs, domains, and IP addresses from the phishing alert.",
  execute: async (context) => {
    // Logic to extract IOCs from context.caseData
    const iocs = {
      urls: ["http://malicious-site.com"],
      ips: ["1.2.3.4"],
      sender: "phisher@example.com"
    };
    
    await logToTimeline(context.caseId, "IOC_EXTRACTION", { iocs });
    return iocs;
  }
};

const enrichIOCs: PlaybookStep = {
  id: "enrich-iocs",
  name: "Enrich IOCs",
  description: "Enriching extracted IOCs with threat intelligence.",
  execute: async (context) => {
    const iocs = context.outputs["extract-iocs"];
    // Simulate enrichment
    const enrichment = {
      "http://malicious-site.com": { reputation: "malicious", category: "phishing" },
      "1.2.3.4": { country: "CN", reputation: "suspicious" }
    };

    await logToTimeline(context.caseId, "IOC_ENRICHMENT", { enrichment });
    return enrichment;
  }
};

const blockSender: PlaybookStep = {
  id: "block-sender",
  name: "Block Sender",
  description: "Blocking the malicious sender in email gateway.",
  execute: async (context) => {
    const iocs = context.outputs["extract-iocs"];
    const sender = iocs?.sender;

    // Simulate blocking
    const result = { blocked: true, sender };

    await logToTimeline(context.caseId, "SENDER_BLOCKED", result);
    return result;
  }
};

const notifyUsers: PlaybookStep = {
  id: "notify-users",
  name: "Notify Users",
  description: "Notifying affected users and security team.",
  execute: async (context) => {
    // Simulate notification
    const result = { notifiedCount: 1, channels: ["email", "slack"] };

    await logToTimeline(context.caseId, "USERS_NOTIFIED", result);
    return result;
  }
};

const createReport: PlaybookStep = {
  id: "create-report",
  name: "Create Report",
  description: "Generating incident response report.",
  execute: async (context) => {
    // Simulate report generation
    const reportId = `REP-${Date.now()}`;
    const result = { reportId, status: "generated" };

    await logToTimeline(context.caseId, "REPORT_GENERATED", result);
    return result;
  }
};

export const phishingPlaybook: Playbook = {
  id: "playbook-phishing",
  name: "Phishing Response Playbook",
  description: "Standard operating procedure for responding to phishing alerts.",
  steps: [
    extractIOCs,
    enrichIOCs,
    blockSender,
    notifyUsers,
    createReport
  ]
};
