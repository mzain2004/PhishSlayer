import { SupabaseClient } from "@supabase/supabase-js";
import { 
  PipelineRun, 
  PipelineStage, 
  AgentDecision, 
  RawAlert,
  DeduplicatedGroup
} from "./types";
import { v4 as uuidv4 } from "uuid";
import { deduplicateAlerts } from "./deduplication";
import { enrichIOC } from "./enrichment/index";
import { tagWithMITRE } from "./mitre";
import { PlaybookEngine } from "./playbooks/engine";
import { HuntEngine } from "./hunting/engine";
import { notifyExternalSystems } from "../connectors/index";
import { AttackPathReconstructor } from "./attack-path/reconstructor";

export class AutonomousOrchestrator {
  private supabase: SupabaseClient;

  constructor(supabase: SupabaseClient) {
    this.supabase = supabase;
  }

  private async createPipelineRun(alert_id: string, org_id: string): Promise<string> {
    const id = uuidv4();
    await this.supabase.from("pipeline_runs").insert({
      id,
      alert_id,
      org_id,
      started_at: new Date().toISOString(),
      stages: []
    });
    return id;
  }

  private async addStage(run_id: string, stage: PipelineStage) {
    const { data: run } = await this.supabase.from("pipeline_runs").select("stages").eq("id", run_id).single();
    const updatedStages = [...(run?.stages || []), { ...stage, started_at: stage.started_at.toISOString(), completed_at: stage.completed_at?.toISOString() }];
    await this.supabase.from("pipeline_runs").update({ stages: updatedStages }).eq("id", run_id);
  }

  public async processAlert(alert_id: string, org_id: string): Promise<PipelineRun | null> {
    const run_id = await this.createPipelineRun(alert_id, org_id);
    const startTime = Date.now();

    try {
      // 1. Fetch Alert
      const stageStart = new Date();
      const { data: alert } = await this.supabase.from("alerts").select("*").eq("id", alert_id).single();
      if (!alert) throw new Error("Alert not found");

      await this.addStage(run_id, { name: "alert_fetched", started_at: stageStart, completed_at: new Date(), success: true, output: { alert_id }, error: null });

      // 2. Deduplication
      const dedupStart = new Date();
      // Simulation of dedup check logic
      const isDuplicate = false; 
      await this.addStage(run_id, { name: "dedup_checked", started_at: dedupStart, completed_at: new Date(), success: true, output: { is_duplicate: isDuplicate }, error: null });
      if (isDuplicate) {
          const decision: AgentDecision = { action: "no_action", confidence: 100, reasoning: "Duplicate merged", executed_at: new Date(), alert_id, case_id: null };
          await this.supabase.from("pipeline_runs").update({ final_decision: decision, completed_at: new Date().toISOString() }).eq("id", run_id);
          return null;
      }

      // 3. IOC Enrichment
      const enrichmentStart = new Date();
      // Extract dummy IOCs from alert for enrichment
      const iocs = [{ type: "ip", value: alert.source_ip }] as any[];
      const enrichmentResults = await Promise.all(iocs.map(ioc => enrichIOC(ioc, this.supabase)));
      
      let boostedSeverity = alert.severity_level;
      if (enrichmentResults.some(r => r.malicious && r.confidence_score > 80)) {
          boostedSeverity = Math.min(alert.severity_level + 2, 15);
          await this.supabase.from("alerts").update({ severity_level: boostedSeverity }).eq("id", alert_id);
      }
      await this.addStage(run_id, { name: "enrichment_complete", started_at: enrichmentStart, completed_at: new Date(), success: true, output: { enrichmentResults, boostedSeverity }, error: null });

      // 4. MITRE Tagging
      const mitreStart = new Date();
      const mitreTag = await tagWithMITRE(alert as any);
      await this.supabase.from("alerts").update({ mitre_tactic: mitreTag.tactic, mitre_technique: mitreTag.technique_id }).eq("id", alert_id);
      await this.addStage(run_id, { name: "mitre_tagged", started_at: mitreStart, completed_at: new Date(), success: true, output: mitreTag, error: null });

      // 5. Agent Decision
      const decisionStart = new Date();
      let action: AgentDecision["action"] = "no_action";
      let confidence = 60;
      let reasoning = "Low severity alert monitored";

      if (boostedSeverity >= 13) {
          action = "escalate_l3"; confidence = 95; reasoning = "P1 critical alert requires immediate L3 investigation";
      } else if (boostedSeverity >= 11) {
          action = "run_playbook"; confidence = 85; reasoning = "P2 alert with high confidence indicators";
      } else if (boostedSeverity >= 9) {
          action = "escalate_l2"; confidence = 75; reasoning = "P3 alert requires analyst triage";
      }

      const final_decision: AgentDecision = { action, confidence, reasoning, executed_at: new Date(), alert_id, case_id: null };
      await this.addStage(run_id, { name: "decision_made", started_at: decisionStart, completed_at: new Date(), success: true, output: final_decision, error: null });

      // 6. Execute Decision
      const execStart = new Date();
      let case_id: string | null = null;

      if (action === "run_playbook") {
          const playbookEngine = new PlaybookEngine(this.supabase);
          // Simplified: always phishing for demo
          await playbookEngine.executePlaybook("phishing", { case_id: alert_id, alert: alert as any, iocs: [], org_id, analyst_id: null, wazuh_agent_id: alert.agent_id, previous_steps: {} });
      } else if (action === "escalate_l2" || action === "escalate_l3") {
          const { data: newCase } = await this.supabase.from("cases").insert({
            title: `Auto-Escalated ${action.toUpperCase()}: ${alert.alert_type} from ${alert.source_ip}`,
            severity: boostedSeverity >= 13 ? "p1" : "p2",
            status: "open",
            alert_type: alert.alert_type,
            source_ip: alert.source_ip,
            org_id: org_id,
            assigned_level: action === "escalate_l2" ? "l2" : "l3"
          }).select("id").single();
          case_id = newCase?.id || null;
          final_decision.case_id = case_id;

          if (case_id) {
              await this.supabase.from("alerts").update({ case_id }).eq("id", alert_id);
              void notifyExternalSystems(case_id, "Auto Escalation", "p1", reasoning, this.supabase);
              
              if (action === "escalate_l3") {
                  const huntEngine = new HuntEngine(this.supabase);
                  void huntEngine.runHunt("powershell_abuse", org_id);
              }
          }
      }

      await this.addStage(run_id, { name: "action_executed", started_at: execStart, completed_at: new Date(), success: true, output: { case_id }, error: null });

      // 7. Attack Path
      if (case_id && boostedSeverity >= 11) {
          const apStart = new Date();
          const reconstructor = new AttackPathReconstructor(this.supabase);
          await reconstructor.reconstructFromCase(case_id, org_id);
          await this.addStage(run_id, { name: "attack_path_reconstructed", started_at: apStart, completed_at: new Date(), success: true, output: null, error: null });
      }

      // 8. Close Pipeline
      const duration = Date.now() - startTime;
      await this.supabase.from("pipeline_runs").update({ 
          completed_at: new Date().toISOString(), 
          final_decision,
          duration_ms: duration
      }).eq("id", run_id);
      
      await this.supabase.from("alerts").update({ pipeline_run_id: run_id }).eq("id", alert_id);

      console.info(`[orchestrator] Pipeline complete for alert ${alert_id} - decision: ${action}`);

      const { data: finalRun } = await this.supabase.from("pipeline_runs").select("*").eq("id", run_id).single();
      return finalRun;

    } catch (error: any) {
      console.error("[orchestrator] Pipeline failed:", error);
      await this.supabase.from("pipeline_runs").update({ 
          error: error.message,
          completed_at: new Date().toISOString() 
      }).eq("id", run_id);
      return null;
    }
  }

  public async processAlertBatch(alert_ids: string[], org_id: string): Promise<PipelineRun[]> {
    const results: PipelineRun[] = [];
    for (const id of alert_ids) {
        const run = await this.processAlert(id, org_id);
        if (run) results.push(run);
    }
    return results;
  }
}
