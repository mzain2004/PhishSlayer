import { SupabaseClient } from "@supabase/supabase-js";
import { RawAlert, AttackPath, AttackPathNode, KillChainStage } from "./types";
import { v4 as uuidv4 } from "uuid";

export class AttackPathEngine {
  private supabase: SupabaseClient;

  constructor(supabase: SupabaseClient) {
    this.supabase = supabase;
  }

  /**
   * Maps MITRE tactics or alert types to Cyber Kill Chain stages.
   */
  private mapToKillChain(alert: RawAlert): KillChainStage {
    const tactic = (alert.mitre_tactic || "").toLowerCase();
    const type = (alert.alert_type || "").toLowerCase();

    if (tactic.includes("initial") || type.includes("phish") || type.includes("exploit")) return "initial_access";
    if (tactic.includes("execution") || type.includes("powershell") || type.includes("cmd")) return "execution";
    if (tactic.includes("persistence") || type.includes("startup") || type.includes("cron")) return "persistence";
    if (tactic.includes("privilege") || type.includes("sudo") || type.includes("root")) return "privilege_escalation";
    if (tactic.includes("defense") || type.includes("obfuscat") || type.includes("bypass")) return "defense_evasion";
    if (tactic.includes("credential") || type.includes("mimikatz") || type.includes("brute")) return "credential_access";
    if (tactic.includes("discovery") || type.includes("scan") || type.includes("recon")) return "discovery";
    if (tactic.includes("lateral") || type.includes("pth") || type.includes("remote")) return "lateral_movement";
    if (tactic.includes("collection") || type.includes("staging") || type.includes("grab")) return "collection";
    if (tactic.includes("exfiltration") || type.includes("upload") || type.includes("transfer")) return "exfiltration";
    if (tactic.includes("command") || type.includes("c2") || type.includes("beacon")) return "command_and_control";

    return "execution"; // Default
  }

  /**
   * Reconstructs an attack path starting from a given alert,
   * correlating other alerts based on asset (IP/Host) and timeframe.
   */
  public async reconstructPath(root_alert_id: string, org_id: string): Promise<AttackPath | null> {
    const { data: rootAlert } = await this.supabase
      .from("alerts")
      .select("*")
      .eq("id", root_alert_id)
      .single();

    if (!rootAlert) return null;

    const asset = rootAlert.agent_id || rootAlert.source_ip;
    const startTime = new Date(new Date(rootAlert.timestamp).getTime() - (60 * 60 * 1000)).toISOString(); // 1h before
    const endTime = new Date(new Date(rootAlert.timestamp).getTime() + (12 * 60 * 60 * 1000)).toISOString(); // 12h after

    // Query related alerts on same asset within window
    const { data: relatedAlerts } = await this.supabase
      .from("alerts")
      .select("*")
      .eq("org_id", org_id)
      .or(`agent_id.eq.${asset},source_ip.eq.${asset},destination_ip.eq.${asset}`)
      .gte("timestamp", startTime)
      .lte("timestamp", endTime)
      .order("timestamp", { ascending: true });

    if (!relatedAlerts || relatedAlerts.length === 0) return null;

    const nodes: AttackPathNode[] = relatedAlerts.map(a => ({
      id: uuidv4(),
      stage: this.mapToKillChain(a),
      alert_id: a.id,
      timestamp: new Date(a.timestamp),
      description: a.rule_description || a.title || "Related security event",
      affected_asset: a.agent_id || a.source_ip || "unknown",
      evidence: a.raw_log
    }));

    // Calculate Risk Score based on stages reached
    const uniqueStages = new Set(nodes.map(n => n.stage));
    let score = uniqueStages.size * 10;
    if (uniqueStages.has("exfiltration")) score += 30;
    if (uniqueStages.has("command_and_control")) score += 20;
    if (nodes.some(n => n.alert_id === root_alert_id && n.stage === "initial_access")) score += 10;

    const timeline_ms = nodes[nodes.length - 1].timestamp.getTime() - nodes[0].timestamp.getTime();

    const path: AttackPath = {
      id: uuidv4(),
      nodes,
      root_cause_alert_id: root_alert_id,
      target_asset: asset,
      risk_score: Math.min(score, 100),
      timeline_ms
    };

    // Persist path for dashboard visibility
    await this.supabase.from("attack_paths").insert({
      id: path.id,
      root_cause_alert_id: root_alert_id,
      org_id,
      nodes: path.nodes,
      risk_score: path.risk_score,
      target_asset: path.target_asset
    });

    return path;
  }

  public async getLatestPaths(org_id: string): Promise<AttackPath[]> {
    const { data } = await this.supabase
      .from("attack_paths")
      .select("*")
      .eq("org_id", org_id)
      .order("created_at", { ascending: false })
      .limit(10);

    return data || [];
  }
}
