import { Playbook, PlaybookContext, PlaybookResult } from "./types";
import { createClient } from "@/lib/supabase/server";

export class PlaybookEngine {
  async execute(playbook: Playbook, context: PlaybookContext): Promise<PlaybookResult> {
    const startTime = new Date().toISOString();
    const stepResults: Record<string, any> = {};
    let overallStatus: "success" | "partial" | "failed" = "success";

    const supabase = await createClient();

    // Initial timeline log for playbook start
    await supabase.from("case_timeline").insert({
      case_id: context.caseId,
      action: "PLAYBOOK_STARTED",
      actor: "system",
      details: { playbook: playbook.name, id: playbook.id }
    });

    for (const step of playbook.steps) {
      try {
        const result = await step.execute(context);
        stepResults[step.id] = { status: "completed", result };
        context.outputs[step.id] = result;
      } catch (error) {
        stepResults[step.id] = { 
          status: "failed", 
          error: error instanceof Error ? error.message : String(error) 
        };
        overallStatus = "failed";
        // Optionally break if sequential execution is required and failure is critical
        break;
      }
    }

    const endTime = new Date().toISOString();

    // Final timeline log
    await supabase.from("case_timeline").insert({
      case_id: context.caseId,
      action: "PLAYBOOK_COMPLETED",
      actor: "system",
      details: { 
        playbook: playbook.name, 
        status: overallStatus,
        duration: new Date(endTime).getTime() - new Date(startTime).getTime()
      }
    });

    return {
      playbookId: playbook.id,
      caseId: context.caseId,
      status: overallStatus,
      stepResults,
      startTime,
      endTime
    };
  }
}
