import { SupabaseClient } from "@supabase/supabase-js";
import { ConnectorSyncResult } from "../soc/types";
import { syncCrowdStrike } from "./crowdstrike";
import { syncElastic } from "./elastic";
import { createServiceNowIncident, updateServiceNowIncident } from "./servicenow";
import { createJiraIssue, closeJiraIssue } from "./jira";
import { triggerPagerDutyAlert, resolvePagerDutyAlert } from "./pagerduty";

export async function syncAllConnectors(supabase: SupabaseClient): Promise<ConnectorSyncResult[]> {
  console.info("[connectors] Starting all-connector sync");
  const results = await Promise.allSettled([
    syncCrowdStrike(supabase),
    syncElastic(supabase)
  ]);

  const finalResults: ConnectorSyncResult[] = results.map((res, i) => {
    if (res.status === "fulfilled") return res.value;
    return {
      connector_type: i === 0 ? "crowdstrike" : "elastic",
      success: false,
      records_synced: 0,
      errors: [String(res.reason)],
      synced_at: new Date()
    };
  });

  return finalResults;
}

export async function notifyExternalSystems(
  case_id: string, 
  title: string, 
  severity: string, 
  description: string, 
  supabase: SupabaseClient
): Promise<void> {
  const extraData: any = {};

  // 1. ServiceNow
  const incidentNumber = await createServiceNowIncident(case_id, title, severity, description);
  if (incidentNumber) extraData.incident_number = incidentNumber;

  // 2. Jira
  const issueKey = await createJiraIssue(case_id, title, severity, description);
  if (issueKey) extraData.jira_issue_key = issueKey;

  // 3. PagerDuty (Critical/High only)
  if (severity === "p1" || severity === "p2") {
    const dedupKey = await triggerPagerDutyAlert(case_id, title, severity, "PhishSlayer");
    if (dedupKey) extraData.pagerduty_dedup_key = dedupKey;
  }

  if (Object.keys(extraData).length > 0) {
    await supabase.from("cases").update({ extra_data: extraData }).eq("id", case_id);
    console.info(`[connectors] External systems notified for case ${case_id}`);
  }
}

export async function resolveExternalSystems(case_id: string, supabase: SupabaseClient): Promise<void> {
  const { data: caseData } = await supabase
    .from("cases")
    .select("extra_data")
    .eq("id", case_id)
    .single();

  const extra = caseData?.extra_data;
  if (!extra) return;

  if (extra.incident_number) {
    await updateServiceNowIncident(extra.incident_number, "resolved", "Automatically resolved by PhishSlayer Autonomous SOC");
  }

  if (extra.jira_issue_key) {
    await closeJiraIssue(extra.jira_issue_key);
  }

  if (extra.pagerduty_dedup_key) {
    await resolvePagerDutyAlert(extra.pagerduty_dedup_key);
  }

  console.info(`[connectors] External systems resolved for case ${case_id}`);
}
