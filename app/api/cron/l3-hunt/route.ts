import { NextRequest, NextResponse } from "next/server";
import { createClient as createSupabaseAdminClient } from "@supabase/supabase-js";
import { z } from "zod";
import {
  buildL3ReasoningPrompt,
  saveReasoningChain,
} from "@/lib/reasoning-chain";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

const ReaderResponseSchema = z.object({
  success: z.boolean(),
  total_iocs: z.number().int().nonnegative().optional(),
  by_source: z
    .object({
      urlhaus: z.number().int().nonnegative(),
      threatfox: z.number().int().nonnegative(),
      openphish: z.number().int().nonnegative(),
    })
    .optional(),
  inserted: z.number().int().nonnegative().optional(),
  deduplicated: z.number().int().nonnegative().optional(),
  error: z.string().optional(),
});

const HunterResponseSchema = z.object({
  success: z.boolean(),
  iocs_processed: z.number().int().nonnegative().optional(),
  scans_cross_referenced: z.number().int().nonnegative().optional(),
  hits_found: z.number().int().nonnegative().optional(),
  escalations_created: z.number().int().nonnegative().optional(),
  errors: z.number().int().nonnegative().optional(),
  error: z.string().optional(),
});

const ReviewerResponseSchema = z.object({
  success: z.boolean(),
  verdict: z.enum(["NORMAL", "SUSPICIOUS", "STORM"]).optional(),
  recommended: z.enum(["CONTINUE", "THROTTLE", "HALT"]).optional(),
  escalations_reviewed: z.number().int().nonnegative().optional(),
  action_taken: z.string().optional(),
  reasoning: z.string().optional(),
  error: z.string().optional(),
});

function isAuthorized(request: NextRequest): boolean {
  return (
    Boolean(process.env.CRON_SECRET) &&
    request.headers.get("authorization") === `Bearer ${process.env.CRON_SECRET}`
  );
}

function getAdminClient() {
  return createSupabaseAdminClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!,
    { auth: { autoRefreshToken: false, persistSession: false } },
  );
}

async function triggerStaticAnalysisForFileAlerts() {
  const internalApiBase = process.env.INTERNAL_API_URL;
  if (!internalApiBase) {
    return { triggered: 0, failed: 0, skipped: true };
  }

  const adminClient = getAdminClient();
  const { data: alerts, error } = await adminClient
    .from("alerts")
    .select("id, file_hash_sha256, file_path")
    .eq("source", "wazuh")
    .eq("status", "pending")
    .not("file_hash_sha256", "is", null)
    .order("created_at", { ascending: false })
    .limit(25);

  if (error || !alerts) {
    return { triggered: 0, failed: 1, skipped: false };
  }

  let triggered = 0;
  let failed = 0;

  for (const alert of alerts) {
    try {
      const alertId =
        typeof alert.id === "string" && alert.id.length > 0 ? alert.id : "";
      const hash =
        typeof alert.file_hash_sha256 === "string" &&
        alert.file_hash_sha256.length > 0
          ? alert.file_hash_sha256
          : "";

      if (!alertId || !hash) {
        continue;
      }

      const { data: existing } = await adminClient
        .from("static_analysis")
        .select("id")
        .eq("alert_id", alertId)
        .limit(1)
        .maybeSingle();

      if (existing?.id) {
        continue;
      }

      const response = await fetch(`${internalApiBase}/api/analysis/static`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${process.env.CRON_SECRET}`,
        },
        body: JSON.stringify({
          file_name:
            typeof alert.file_path === "string" && alert.file_path.length > 0
              ? alert.file_path
              : `${hash}.bin`,
          file_content_base64: "",
          file_hash_sha256: hash,
          alert_id: alertId,
        }),
      });

      if (!response.ok) {
        failed += 1;
        continue;
      }

      triggered += 1;
    } catch {
      failed += 1;
    }
  }

  return { triggered, failed, skipped: false };
}

async function invokeStep<T>(
  request: NextRequest,
  path: string,
  schema: z.ZodSchema<T>,
) {
  const response = await fetch(`${process.env.INTERNAL_API_URL}${path}`, {
    method: "GET",
    headers: {
      Authorization: `Bearer ${process.env.CRON_SECRET}`,
    },
  });

  const payload = await response.json();
  const parsed = schema.safeParse(payload);
  if (!parsed.success) {
    throw new Error(`Invalid response shape from ${path}`);
  }

  if (
    !response.ok ||
    !parsed.data ||
    !(parsed.data as { success?: boolean }).success
  ) {
    throw new Error(`Step failed: ${path}`);
  }

  return parsed.data;
}

export async function GET(request: NextRequest) {
  if (!isAuthorized(request)) {
    return NextResponse.json(
      { success: false, error: "Unauthorized" },
      { status: 401 },
    );
  }

  try {
    const reader = await invokeStep(
      request,
      "/api/agent/hunter/reader",
      ReaderResponseSchema,
    );

    const hunter = await invokeStep(
      request,
      "/api/agent/hunter/hunt",
      HunterResponseSchema,
    );

    const reviewerStartedAt = Date.now();
    const reviewer = await invokeStep(
      request,
      "/api/agent/hunter/review",
      ReviewerResponseSchema,
    );
    const staticAnalysis = await triggerStaticAnalysisForFileAlerts();
    const executionTimeMs = Date.now() - reviewerStartedAt;

    const huntSummary = {
      reader,
      hunter,
      reviewer,
    };

    await saveReasoningChain({
      agent_level: "L3",
      decision:
        reviewer.recommended || reviewer.verdict || "NEEDS_INVESTIGATION",
      confidence_score: undefined,
      reasoning_text:
        reviewer.reasoning ||
        "L3 reviewer completed circuit-breaker check without detailed reasoning.",
      iocs_considered: [
        {
          total_iocs: reader.total_iocs || 0,
          by_source: reader.by_source || null,
          hits_found: hunter.hits_found || 0,
          prompt_context: buildL3ReasoningPrompt([huntSummary]),
        },
      ],
      actions_taken: [
        reviewer.action_taken || reviewer.recommended || "CONTINUE",
      ],
      model_used: "gemini-2.5-flash",
      execution_time_ms: executionTimeMs,
    });

    const halted = reviewer.recommended === "HALT";

    return NextResponse.json({
      success: true,
      reader,
      hunter,
      reviewer,
      static_analysis: staticAnalysis,
      halted,
    });
  } catch (error) {
    return NextResponse.json(
      {
        success: false,
        error: error instanceof Error ? error.message : "L3 pipeline failed",
        halted: false,
      },
      { status: 500 },
    );
  }
}
