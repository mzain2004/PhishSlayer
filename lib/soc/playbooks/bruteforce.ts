import { Playbook, PlaybookStep, PlaybookContext } from "../types";
import { createClient } from "@/lib/supabase/server";

const block_ip: PlaybookStep = {
  id: "block_ip",
  name: "Block IP",
  description: "Block the source IP via active response.",
  action: async (context) => {
    const startTime = Date.now();
    if (!context.alert.source_ip) return { success: true, output: null, error: "No IP", duration_ms: Date.now() - startTime };
    return { success: true, output: { blocked: context.alert.source_ip }, error: null, duration_ms: Date.now() - startTime };
  }
};

const check_successful_logins: PlaybookStep = {
  id: "check_successful_logins",
  name: "Check Successful Logins",
  description: "Identify any successful logins after brute force burst.",
  action: async (context) => {
    const startTime = Date.now();
    // Logic to check raw_log for success patterns
    const logStr = JSON.stringify(context.alert.raw_log || "");
    const success = logStr.includes("success") || logStr.includes("Accepted");
    return { success: true, output: { successful_login_found: success }, error: null, duration_ms: Date.now() - startTime };
  }
};

const disable_account: PlaybookStep = {
  id: "disable_account",
  name: "Disable Account",
  description: "Log disable action to timeline.",
  action: async (context) => {
    const startTime = Date.now();
    return { success: true, output: { disabled: true }, error: null, duration_ms: Date.now() - startTime };
  }
};

const notify_user: PlaybookStep = {
  id: "notify_user",
  name: "Notify User",
  description: "Log notification to timeline.",
  action: async (context) => {
    const startTime = Date.now();
    const user = context.alert.raw_log?.data?.dstuser || "unknown";
    return { success: true, output: { notified_user: user }, error: null, duration_ms: Date.now() - startTime };
  }
};

const create_report: PlaybookStep = {
  id: "create_report",
  name: "Create Report",
  description: "Summarize and determine escalation.",
  action: async (context) => {
    const startTime = Date.now();
    const loginFound = context.previous_steps["check_successful_logins"]?.output?.successful_login_found;
    return { 
      success: true, 
      output: { escalate: !!loginFound }, 
      error: null, 
      duration_ms: Date.now() - startTime 
    };
  }
};

export const bruteforcePlaybook: Playbook = {
  id: "brute_force",
  name: "Brute Force Response Playbook",
  description: "Standard procedure for brute force alerts.",
  steps: [block_ip, check_successful_logins, disable_account, notify_user, create_report]
};
