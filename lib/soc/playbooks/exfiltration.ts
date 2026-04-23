import { Playbook, PlaybookStep, PlaybookContext } from "../types";
import { createClient } from "@/lib/supabase/server";

const isolate_host: PlaybookStep = {
  id: "isolate_host",
  name: "Isolate Host",
  description: "Critical: Isolate host immediately.",
  required: true,
  action: async (context) => {
    const startTime = Date.now();
    return { success: true, output: { action: "ISOLATE" }, error: null, duration_ms: Date.now() - startTime };
  }
};

const revoke_tokens: PlaybookStep = {
  id: "revoke_tokens",
  name: "Revoke Tokens",
  description: "Log token revocation.",
  action: async (context) => {
    const startTime = Date.now();
    return { success: true, output: { revoked: true }, error: null, duration_ms: Date.now() - startTime };
  }
};

const preserve_logs: PlaybookStep = {
  id: "preserve_logs",
  name: "Preserve Logs",
  description: "Copy logs to case evidence.",
  action: async (context) => {
    const startTime = Date.now();
    const supabase = await createClient();
    await supabase.from("case_evidence").insert({
      case_id: context.case_id,
      evidence_type: "raw_log",
      content: context.alert.raw_log
    });
    return { success: true, output: { preserved: true }, error: null, duration_ms: Date.now() - startTime };
  }
};

const escalate: PlaybookStep = {
  id: "escalate",
  name: "Escalate",
  description: "Always escalate exfiltration.",
  action: async (context) => {
    const startTime = Date.now();
    return { success: true, output: { escalate: true }, error: null, duration_ms: Date.now() - startTime };
  }
};

const create_report: PlaybookStep = {
  id: "create_report",
  name: "Create Report",
  description: "Set P1 severity and update SLA.",
  action: async (context) => {
    const startTime = Date.now();
    const supabase = await createClient();
    const sla = new Date(Date.now() + 15 * 60 * 1000).toISOString();
    await supabase.from("cases").update({
      severity: "p1",
      sla_deadline: sla
    }).eq("id", context.case_id);
    return { success: true, output: { severity: "p1", sla }, error: null, duration_ms: Date.now() - startTime };
  }
};

export const exfiltrationPlaybook: Playbook = {
  id: "exfiltration",
  name: "Exfiltration Response Playbook",
  description: "Standard procedure for data exfiltration alerts.",
  steps: [isolate_host, revoke_tokens, preserve_logs, escalate, create_report]
};
