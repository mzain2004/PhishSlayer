import { Playbook, PlaybookStep, PlaybookContext, PlaybookResult, StepResult } from "../types";
import { SupabaseClient } from "@supabase/supabase-js";
import { phishingPlaybook } from "./phishing";
import { malwarePlaybook } from "./malware";
import { bruteforcePlaybook } from "./bruteforce";
import { exfiltrationPlaybook } from "./exfiltration";

export class PlaybookEngine {
  private playbooks: Map<string, Playbook> = new Map();
  private supabase: SupabaseClient;

  constructor(supabase: SupabaseClient) {
    this.supabase = supabase;
    this.registerPlaybook(phishingPlaybook.id, phishingPlaybook.steps);
    this.registerPlaybook(malwarePlaybook.id, malwarePlaybook.steps);
    this.registerPlaybook(bruteforcePlaybook.id, bruteforcePlaybook.steps);
    this.registerPlaybook(exfiltrationPlaybook.id, exfiltrationPlaybook.steps);
  }

  public registerPlaybook(id: string, steps: PlaybookStep[]) {
    // Basic implementation for registration
    this.playbooks.set(id, {
      id,
      name: id.charAt(0).toUpperCase() + id.slice(1).replace("_", " "),
      description: `Playbook for ${id}`,
      steps
    });
  }

  private async logToTimeline(case_id: string, action: string, details: any) {
    await this.supabase.from("case_timeline").insert({
      case_id,
      action,
      actor: "system",
      details,
      created_at: new Date().toISOString()
    });
  }

  private enforceTimeout<T>(promise: Promise<T>, ms: number): Promise<T> {
    const timeout = new Promise<never>((_, reject) => {
      setTimeout(() => reject(new Error(`Step timed out after ${ms}ms`)), ms);
    });
    return Promise.race([promise, timeout]);
  }

  public async executePlaybook(playbook_id: string, context: PlaybookContext): Promise<PlaybookResult> {
    const playbook = this.playbooks.get(playbook_id);
    if (!playbook) throw new Error(`Playbook ${playbook_id} not found`);

    const startTime = Date.now();
    const stepResults: Record<string, StepResult> = {};
    let stepsExecuted = 0;
    let stepsFailed = 0;
    let escalateToL3 = false;
    let escalationReason: string | null = null;

    // Start
    await this.supabase.from("cases").update({ status: "investigating" }).eq("id", context.case_id);
    await this.logToTimeline(context.case_id, "PLAYBOOK_STARTED", { playbook_id });

    for (const step of playbook.steps) {
      stepsExecuted++;
      const stepStartTime = Date.now();
      
      try {
        const result = await this.enforceTimeout(
          step.action(context),
          step.timeout_ms || 30000
        );
        
        stepResults[step.id] = result;
        context.previous_steps[step.id] = result;

        await this.logToTimeline(context.case_id, `STEP_COMPLETED: ${step.id}`, result);

        if (!result.success) {
          stepsFailed++;
          if (step.required !== false) {
            escalateToL3 = true;
            escalationReason = `Required step ${step.id} failed: ${result.error}`;
            break; 
          }
        }
      } catch (error: any) {
        stepsFailed++;
        const failedResult: StepResult = {
          success: false,
          output: null,
          error: error.message,
          duration_ms: Date.now() - stepStartTime
        };
        stepResults[step.id] = failedResult;
        await this.logToTimeline(context.case_id, `STEP_FAILED: ${step.id}`, { error: error.message });

        if (step.required !== false) {
          escalateToL3 = true;
          escalationReason = `Critical step ${step.id} exception: ${error.message}`;
          break;
        }
      }
    }

    const totalDuration = Date.now() - startTime;
    const success = stepsFailed === 0;

    if (success && !escalateToL3) {
      await this.supabase.from("cases").update({ status: "contained" }).eq("id", context.case_id);
    }

    const result: PlaybookResult = {
      playbook_id,
      case_id: context.case_id,
      success,
      steps_executed: stepsExecuted,
      steps_failed: stepsFailed,
      total_duration_ms: totalDuration,
      step_results: stepResults,
      escalate_to_l3: escalateToL3,
      escalation_reason: escalationReason
    };

    await this.logToTimeline(context.case_id, "PLAYBOOK_FINISHED", { success, steps_executed: stepsExecuted });

    return result;
  }
}
