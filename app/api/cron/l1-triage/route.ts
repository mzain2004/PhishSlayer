import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import {
  buildL1ReasoningPrompt,
  saveReasoningChain,
} from "@/lib/reasoning-chain";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

const TriageSummarySchema = z.object({
  success: z.boolean(),
  processed: z.number().int().nonnegative().optional(),
  closed: z.number().int().nonnegative().optional(),
  escalated: z.number().int().nonnegative().optional(),
  errors: z.number().int().nonnegative().optional(),
  results: z
    .array(
      z.object({
        scan_id: z.string().nullable().optional(),
        item_id: z.string().optional(),
        alert_id: z.string().nullable().optional(),
        escalation_id: z.string().nullable().optional(),
        source: z.enum(["wazuh", "scans"]).optional(),
        decision: z.enum(["CLOSE", "ESCALATE"]),
        confidence: z.number(),
        severity: z.enum(["low", "medium", "high", "critical"]).optional(),
        reasoning: z.string(),
      }),
    )
    .optional(),
  error: z.string().optional(),
});

function isAuthorized(request: NextRequest): boolean {
  const auth = request.headers.get("authorization") || "";
  return (
    Boolean(process.env.CRON_SECRET) &&
    auth === `Bearer ${process.env.CRON_SECRET}`
  );
}

export async function GET(request: NextRequest) {
  if (!isAuthorized(request)) {
    return NextResponse.json(
      { success: false, error: "Unauthorized" },
      { status: 401 },
    );
  }

  const startedAt = Date.now();
  const internalBaseUrl =
    process.env.INTERNAL_API_URL ?? request.nextUrl.origin;
  const response = await fetch(
    `${internalBaseUrl}/api/agent/triage?alert_min_age_minutes=5&include_scans=true`,
    {
    method: "GET",
    headers: {
      Authorization: `Bearer ${process.env.CRON_SECRET}`,
    },
    },
  );

  const payload = await response.json();
  const executionTimeMs = Date.now() - startedAt;
  const parsed = TriageSummarySchema.safeParse(payload);

  if (!parsed.success) {
    return NextResponse.json(
      {
        success: false,
        error: "Invalid triage agent response",
      },
      { status: 502 },
    );
  }

  if (parsed.data.results?.length) {
    const saves = parsed.data.results.map((result) => {
      const recordId = result.item_id || result.scan_id;
      const normalizedRecordId = recordId ?? undefined;
      return saveReasoningChain({
        alert_id: result.source === "wazuh" ? normalizedRecordId : undefined,
        agent_level: "L1",
        decision: result.decision,
        confidence_score: result.confidence,
        reasoning_text: result.reasoning,
        iocs_considered: [
          {
            source: result.source || "unknown",
            severity: result.severity || "unknown",
            prompt_context: buildL1ReasoningPrompt({
              rule_description: payload?.rule_description,
              level: result.severity,
              source_ip: payload?.source_ip,
              agent_name: payload?.agent_name,
              timestamp: payload?.timestamp,
              full_log: payload,
            }),
          },
        ],
        actions_taken: [
          result.decision === "CLOSE" ? "CLOSE" : "ESCALATE_TO_HUMAN",
        ],
        model_used: "gemini-2.5-flash",
        execution_time_ms: executionTimeMs,
      });
    });

    await Promise.allSettled(saves);
  }

  return NextResponse.json(parsed.data, { status: response.status });
}
