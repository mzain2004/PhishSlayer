import { NextRequest, NextResponse } from "next/server";
import { createClient as createSupabaseAdminClient } from "@supabase/supabase-js";
import { z } from "zod";
import {
  buildL3ReasoningPrompt,
  saveReasoningChain,
} from "@/lib/reasoning-chain";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

const SWEEP_HUNT_MIN_AGE_MINUTES = 30;

const L3_STAGE_ACTION = "L3_HUNT_STAGE";
const L3_STAGE_FAILURE_ACTION = "L3_STAGE_FAILURE";
const L3_STATIC_ANALYSIS_STAGE_ACTION = "L3_STATIC_ANALYSIS_STAGE";

type L3StageName =
  | "reader_started"
  | "iocs_ingested"
  | "hunt_started"
  | "correlations_found"
  | "review_started"
  | "findings_persisted";

type StaticAnalysisStageName =
  | "file_alert_received"
  | "static_analysis_triggered"
  | "result_stored";

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
  verdict: z.enum(["PROCEED", "HALT", "REDUCE_SCOPE"]).optional(),
  confidence: z.number().min(0).max(1).optional(),
  halt_reason: z.string().optional(),
  quality_issues: z.array(z.string()).optional(),
  approved_findings: z.array(z.number().int().nonnegative()).optional(),
  rejected_findings: z.array(z.string()).optional(),
  reviewer_notes: z.string().optional(),
  escalations_reviewed: z.number().int().nonnegative().optional(),
  action_taken: z.string().optional(),
  error: z.string().optional(),
});

function isAuthorized(request: NextRequest): boolean {
  return (
    Boolean(process.env.CRON_SECRET) &&
    request.headers.get("authorization") === `Bearer ${process.env.CRON_SECRET}`
  );
}

function isInternalAgentAuthorized(request: NextRequest): boolean {
  const providedSecret =
    request.headers.get("AGENT_SECRET") ||
    request.headers.get("agent_secret") ||
    request.headers.get("x-agent-secret");

  return Boolean(providedSecret && providedSecret === process.env.AGENT_SECRET);
}

function getAdminClient() {
  return createSupabaseAdminClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!,
    { auth: { autoRefreshToken: false, persistSession: false } },
  );
}

function getInternalBaseUrl(request: NextRequest): string {
  return process.env.INTERNAL_API_URL ?? request.nextUrl.origin;
}

async function writeAuditLogSafe(
  adminClient: ReturnType<typeof getAdminClient>,
  action: string,
  severity: "low" | "medium" | "high" | "critical",
  metadata: Record<string, unknown>,
) {
  const { error } = await adminClient.from("audit_logs").insert({
    action,
    severity,
    metadata,
    created_at: new Date().toISOString(),
  });

  if (error) {
    console.error("[L3 cron] failed writing audit log", {
      action,
      severity,
      error,
    });
  }
}

async function logL3Stage(
  adminClient: ReturnType<typeof getAdminClient>,
  cycleId: string,
  stage: L3StageName,
  metadata: Record<string, unknown> = {},
) {
  await writeAuditLogSafe(adminClient, L3_STAGE_ACTION, "low", {
    stage,
    cycle_id: cycleId,
    ...metadata,
  });
}

async function logStageFailure(
  adminClient: ReturnType<typeof getAdminClient>,
  cycleId: string,
  stage: "reader" | "hunt" | "review" | "findings" | "static_analysis",
  error: unknown,
  extra: Record<string, unknown> = {},
) {
  await writeAuditLogSafe(adminClient, L3_STAGE_FAILURE_ACTION, "medium", {
    stage,
    cycle_id: cycleId,
    error: error instanceof Error ? error.message : "unknown_error",
    ...extra,
  });
}

async function logStaticAnalysisStage(
  adminClient: ReturnType<typeof getAdminClient>,
  cycleId: string,
  stage: StaticAnalysisStageName,
  metadata: Record<string, unknown>,
) {
  await writeAuditLogSafe(adminClient, L3_STATIC_ANALYSIS_STAGE_ACTION, "low", {
    cycle_id: cycleId,
    stage,
    ...metadata,
  });
}

async function triggerStaticAnalysisForFileAlerts(
  adminClient: ReturnType<typeof getAdminClient>,
  internalApiBase: string,
  cycleId: string,
) {
  if (!internalApiBase) {
    return { scanned: 0, triggered: 0, failed: 0, skipped: true };
  }

  const { data: alerts, error } = await adminClient
    .from("alerts")
    .select("id, file_hash_sha256, file_path")
    .eq("source", "wazuh")
    .eq("status", "pending")
    .not("file_hash_sha256", "is", null)
    .order("created_at", { ascending: false })
    .limit(25);

  if (error) {
    await logStageFailure(
      adminClient,
      cycleId,
      "static_analysis",
      new Error(`Failed to query file-hash alerts: ${error.message}`),
      { context: "alert_query" },
    );
    return { scanned: 0, triggered: 0, failed: 1, skipped: false };
  }

  if (!alerts || alerts.length === 0) {
    return { scanned: 0, triggered: 0, failed: 0, skipped: false };
  }

  let scanned = 0;
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

      scanned += 1;

      await logStaticAnalysisStage(
        adminClient,
        cycleId,
        "file_alert_received",
        {
          alert_id: alertId,
          file_hash_sha256: hash,
        },
      );

      const { data: existing } = await adminClient
        .from("static_analysis")
        .select("id")
        .eq("alert_id", alertId)
        .limit(1)
        .maybeSingle();

      if (existing?.id) {
        await logStaticAnalysisStage(adminClient, cycleId, "result_stored", {
          alert_id: alertId,
          storage_status: "already_present",
          static_analysis_id: existing.id,
        });
        continue;
      }

      await logStaticAnalysisStage(
        adminClient,
        cycleId,
        "static_analysis_triggered",
        {
          alert_id: alertId,
          file_hash_sha256: hash,
        },
      );

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

        await logStaticAnalysisStage(adminClient, cycleId, "result_stored", {
          alert_id: alertId,
          storage_status: "failed",
          error: `analysis_route_${response.status}`,
        });
        continue;
      }

      const { data: storedRecord } = await adminClient
        .from("static_analysis")
        .select("id")
        .eq("alert_id", alertId)
        .order("created_at", { ascending: false })
        .limit(1)
        .maybeSingle();

      await logStaticAnalysisStage(adminClient, cycleId, "result_stored", {
        alert_id: alertId,
        storage_status: storedRecord?.id
          ? "stored"
          : "not_detected_after_trigger",
        static_analysis_id: storedRecord?.id || null,
      });

      triggered += 1;
    } catch (error) {
      failed += 1;

      await logStageFailure(adminClient, cycleId, "static_analysis", error, {
        context: "analysis_trigger_loop",
      });

      await logStaticAnalysisStage(adminClient, cycleId, "result_stored", {
        alert_id:
          typeof alert.id === "string" && alert.id.length > 0 ? alert.id : null,
        storage_status: "failed",
        error: error instanceof Error ? error.message : "unknown_error",
      });
    }
  }

  return { scanned, triggered, failed, skipped: false };
}

async function invokeStep<T>(
  baseUrl: string,
  cycleId: string,
  path: string,
  schema: z.ZodSchema<T>,
) {
  let payload: unknown = null;

  try {
    const response = await fetch(`${baseUrl}${path}`, {
      method: "GET",
      headers: {
        Authorization: `Bearer ${process.env.CRON_SECRET}`,
        "x-l3-cycle-id": cycleId,
      },
      cache: "no-store",
    });

    try {
      payload = await response.json();
    } catch {
      payload = null;
    }

    if (!response.ok) {
      return {
        ok: false as const,
        error: `Step failed (${response.status}) for ${path}`,
        payload,
      };
    }

    const parsed = schema.safeParse(payload);
    if (!parsed.success) {
      return {
        ok: false as const,
        error: `Invalid response shape from ${path}`,
        payload,
      };
    }

    if (!(parsed.data as { success?: boolean }).success) {
      return {
        ok: false as const,
        error: `Step returned unsuccessful result for ${path}`,
        payload,
      };
    }

    return { ok: true as const, data: parsed.data };
  } catch (error) {
    return {
      ok: false as const,
      error:
        error instanceof Error ? error.message : `Unknown error in ${path}`,
      payload,
    };
  }
}

type L3RunOptions = {
  triggerMode: "sweep" | "event";
  minHuntRecordAgeMinutes: number;
  triggerReason?: string;
  l2Context?: {
    action: "ISOLATE_IDENTITY" | "BLOCK_IP" | "HUNT" | "MANUAL_REVIEW";
    confidence: number;
    reasoning: string | null;
    duration_ms: number;
    timed_out: boolean;
    error: string | null;
  } | null;
};

function parseL2Context(value: unknown): L3RunOptions["l2Context"] {
  if (!value || typeof value !== "object") {
    return null;
  }

  const raw = value as Record<string, unknown>;
  const action = raw.action;

  if (
    action !== "ISOLATE_IDENTITY" &&
    action !== "BLOCK_IP" &&
    action !== "HUNT" &&
    action !== "MANUAL_REVIEW"
  ) {
    return null;
  }

  return {
    action,
    confidence:
      typeof raw.confidence === "number" && Number.isFinite(raw.confidence)
        ? raw.confidence
        : 0,
    reasoning:
      typeof raw.reasoning === "string" && raw.reasoning.trim().length > 0
        ? raw.reasoning
        : null,
    duration_ms:
      typeof raw.duration_ms === "number" && Number.isFinite(raw.duration_ms)
        ? raw.duration_ms
        : 0,
    timed_out: Boolean(raw.timed_out),
    error:
      typeof raw.error === "string" && raw.error.trim().length > 0
        ? raw.error
        : null,
  };
}

async function runL3Pipeline(request: NextRequest, options: L3RunOptions) {
  const startedAt = Date.now();
  const cycleId = `l3-cycle-${startedAt}`;
  const adminClient = getAdminClient();
  const baseUrl = getInternalBaseUrl(request);
  const stageErrors: string[] = [];
  const hunterPath =
    options.minHuntRecordAgeMinutes > 0
      ? `/api/agent/hunter/hunt?min_age_minutes=${options.minHuntRecordAgeMinutes}`
      : "/api/agent/hunter/hunt";

  let reader: z.infer<typeof ReaderResponseSchema> = {
    success: false,
    total_iocs: 0,
    by_source: { urlhaus: 0, threatfox: 0, openphish: 0 },
    inserted: 0,
    deduplicated: 0,
    error: "reader_not_run",
  };

  let hunter: z.infer<typeof HunterResponseSchema> = {
    success: false,
    iocs_processed: 0,
    scans_cross_referenced: 0,
    hits_found: 0,
    escalations_created: 0,
    errors: 0,
    error: "hunter_not_run",
  };

  let reviewer: z.infer<typeof ReviewerResponseSchema> = {
    success: true,
    verdict: "PROCEED",
    confidence: 0,
    halt_reason: undefined,
    quality_issues: [],
    approved_findings: [],
    rejected_findings: [],
    reviewer_notes: "review_stage_defaulted",
    escalations_reviewed: 0,
    action_taken: "NONE",
  };

  await logL3Stage(adminClient, cycleId, "reader_started", {
    step_path: "/api/agent/hunter/reader",
    trigger_mode: options.triggerMode,
    trigger_reason: options.triggerReason || null,
    l2_context: options.l2Context || null,
  });

  const readerResult = await invokeStep(
    baseUrl,
    cycleId,
    "/api/agent/hunter/reader",
    ReaderResponseSchema,
  );

  if (readerResult.ok) {
    reader = readerResult.data;
  } else {
    reader.error = readerResult.error;
    stageErrors.push(`reader: ${readerResult.error}`);
    await logStageFailure(adminClient, cycleId, "reader", readerResult.error, {
      step_path: "/api/agent/hunter/reader",
      payload: readerResult.payload,
    });
  }

  await logL3Stage(adminClient, cycleId, "iocs_ingested", {
    total_iocs: reader.total_iocs || 0,
    by_source: reader.by_source || null,
    inserted: reader.inserted || 0,
    deduplicated: reader.deduplicated || 0,
    reader_success: readerResult.ok,
    reader_error: readerResult.ok ? null : readerResult.error,
  });

  await logL3Stage(adminClient, cycleId, "hunt_started", {
    step_path: hunterPath,
    min_hunt_record_age_minutes: options.minHuntRecordAgeMinutes,
    l2_context: options.l2Context || null,
  });

  const hunterResult = await invokeStep(
    baseUrl,
    cycleId,
    hunterPath,
    HunterResponseSchema,
  );

  if (hunterResult.ok) {
    hunter = hunterResult.data;
  } else {
    hunter.error = hunterResult.error;
    stageErrors.push(`hunt: ${hunterResult.error}`);
    await logStageFailure(adminClient, cycleId, "hunt", hunterResult.error, {
      step_path: hunterPath,
      payload: hunterResult.payload,
    });
  }

  await logL3Stage(adminClient, cycleId, "correlations_found", {
    iocs_processed: hunter.iocs_processed || 0,
    scans_cross_referenced: hunter.scans_cross_referenced || 0,
    hits_found: hunter.hits_found || 0,
    escalations_created: hunter.escalations_created || 0,
    hunt_errors: hunter.errors || 0,
    hunt_success: hunterResult.ok,
    hunt_error: hunterResult.ok ? null : hunterResult.error,
  });

  await logL3Stage(adminClient, cycleId, "review_started", {
    step_path: "/api/agent/hunter/review",
  });

  const reviewerResult = await invokeStep(
    baseUrl,
    cycleId,
    "/api/agent/hunter/review",
    ReviewerResponseSchema,
  );

  if (reviewerResult.ok) {
    reviewer = reviewerResult.data;
  } else {
    reviewer = {
      success: true,
      verdict: "PROCEED",
      confidence: 0,
      halt_reason: undefined,
      quality_issues: ["review_stage_failed_fallback"],
      approved_findings: [],
      rejected_findings: [],
      reviewer_notes: "review_stage_failed_fallback_proceed",
      escalations_reviewed: 0,
      action_taken: "NONE",
      error: reviewerResult.error,
    };
    stageErrors.push(`review: ${reviewerResult.error}`);
    await logStageFailure(
      adminClient,
      cycleId,
      "review",
      reviewerResult.error,
      {
        step_path: "/api/agent/hunter/review",
        payload: reviewerResult.payload,
        fallback_applied: true,
      },
    );
  }

  let staticAnalysis = {
    scanned: 0,
    triggered: 0,
    failed: 0,
    skipped: false,
  };

  try {
    staticAnalysis = await triggerStaticAnalysisForFileAlerts(
      adminClient,
      baseUrl,
      cycleId,
    );
  } catch (error) {
    stageErrors.push(
      `static_analysis: ${error instanceof Error ? error.message : "unknown_error"}`,
    );
    await logStageFailure(adminClient, cycleId, "static_analysis", error, {
      context: "static_analysis_execution",
    });
  }

  const halted = reviewer.verdict === "HALT";
  const reducedScope = reviewer.verdict === "REDUCE_SCOPE";
  const haltReason = halted
    ? reviewer.halt_reason ||
      reviewer.reviewer_notes ||
      "circuit_breaker_halted_without_reason"
    : null;

  if (halted) {
    await writeAuditLogSafe(
      adminClient,
      "L3_CIRCUIT_BREAKER_HALTED",
      "critical",
      {
        cycle_id: cycleId,
        halt_reason: haltReason,
        verdict: reviewer.verdict || "HALT",
        reduced_scope: reducedScope,
        quality_issues: reviewer.quality_issues || [],
      },
    );

    const { error: haltFindingError } = await adminClient
      .from("hunt_findings")
      .insert({
        hunt_type: "escalation_burst",
        severity: "critical",
        confidence: reviewer.confidence || 0,
        title: "L3 Circuit Breaker Halted Hunt Cycle",
        description: haltReason || "L3 review halted hunt cycle",
        indicators: {
          cycle_id: cycleId,
          halt_reason: haltReason,
          reviewer_verdict: reviewer.verdict || "HALT",
        },
        source_records: [],
        escalated: false,
        escalation_id: null,
        created_by: "l3_agent",
        created_at: new Date().toISOString(),
      });

    if (haltFindingError) {
      await logStageFailure(
        adminClient,
        cycleId,
        "findings",
        haltFindingError,
        {
          context: "halt_reason_finding_insert",
        },
      );
    }
  }

  const executionTimeMs = Date.now() - startedAt;
  const huntSummary = {
    reader,
    hunter,
    reviewer,
    static_analysis: staticAnalysis,
  };

  try {
    await saveReasoningChain({
      agent_level: "L3",
      decision: reviewer.verdict || "PROCEED",
      confidence_score: reviewer.confidence,
      reasoning_text:
        reviewer.reviewer_notes ||
        "L3 reviewer completed circuit-breaker check without detailed reasoning.",
      iocs_considered: [
        {
          total_iocs: reader.total_iocs || 0,
          by_source: reader.by_source || null,
          hits_found: hunter.hits_found || 0,
          cycle_id: cycleId,
          reduced_scope: reducedScope,
          l2_context: options.l2Context || null,
          prompt_context: buildL3ReasoningPrompt([huntSummary]),
        },
      ],
      actions_taken: [reviewer.action_taken || reviewer.verdict || "PROCEED"],
      model_used: "gemini-2.5-flash",
      execution_time_ms: executionTimeMs,
    });
  } catch (error) {
    stageErrors.push(
      `findings_persisted: ${error instanceof Error ? error.message : "unknown_error"}`,
    );
    await logStageFailure(adminClient, cycleId, "findings", error, {
      context: "save_reasoning_chain",
    });
  }

  await logL3Stage(adminClient, cycleId, "findings_persisted", {
    findings_count: hunter.hits_found || 0,
    confidence_score: reviewer.confidence || 0,
    reasoning_summary: reviewer.reviewer_notes || null,
    halted,
    reduced_scope: reducedScope,
    halt_reason: haltReason,
    execution_time_ms: executionTimeMs,
    l2_context: options.l2Context || null,
  });

  return NextResponse.json({
    success: true,
    cycle_id: cycleId,
    trigger_mode: options.triggerMode,
    trigger_reason: options.triggerReason || null,
    min_hunt_record_age_minutes: options.minHuntRecordAgeMinutes,
    l2_context: options.l2Context || null,
    reader,
    hunter,
    reviewer,
    static_analysis: staticAnalysis,
    halted,
    reduced_scope: reducedScope,
    stage_errors: stageErrors,
    execution_time_ms: executionTimeMs,
  });
}

export async function GET(request: NextRequest) {
  if (!isAuthorized(request)) {
    return NextResponse.json(
      { success: false, error: "Unauthorized" },
      { status: 401 },
    );
  }

  return runL3Pipeline(request, {
    triggerMode: "sweep",
    minHuntRecordAgeMinutes: SWEEP_HUNT_MIN_AGE_MINUTES,
    triggerReason: "cron_sweep",
  });
}

export async function POST(request: NextRequest) {
  if (!isInternalAgentAuthorized(request) && !isAuthorized(request)) {
    return NextResponse.json(
      { success: false, error: "Unauthorized" },
      { status: 401 },
    );
  }

  let body: Record<string, unknown> = {};

  try {
    const parsed = (await request.json()) as Record<string, unknown>;
    body = parsed && typeof parsed === "object" ? parsed : {};
  } catch {
    body = {};
  }

  const triggerReason =
    typeof body.trigger_reason === "string" &&
    body.trigger_reason.trim().length > 0
      ? body.trigger_reason.trim()
      : "event_driven_trigger";
  const minAgeRaw =
    typeof body.min_hunt_record_age_minutes === "number"
      ? body.min_hunt_record_age_minutes
      : typeof body.min_hunt_record_age_minutes === "string"
        ? Number(body.min_hunt_record_age_minutes)
        : NaN;
  const minHuntRecordAgeMinutes = Number.isFinite(minAgeRaw)
    ? Math.max(0, minAgeRaw)
    : 0;
  const l2Context = parseL2Context(body.l2_context);

  return runL3Pipeline(request, {
    triggerMode: "event",
    minHuntRecordAgeMinutes,
    triggerReason,
    l2Context,
  });
}
