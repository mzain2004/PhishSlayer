import { NextRequest, NextResponse } from "next/server";
import { createClient as createSupabaseAdminClient } from "@supabase/supabase-js";
import { createClient as createServerSupabaseClient } from "@/lib/supabase/server";
import { z } from "zod";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

const DecisionSchema = z.object({
  decision: z.enum(["CLOSE", "ESCALATE"]),
  severity: z.enum(["low", "medium", "high", "critical"]),
  confidence: z.number().min(0).max(1),
  reasoning: z.string().min(1),
  mitre_context: z.string().min(1),
  false_positive_indicators: z.array(z.string()),
  threat_indicators: z.array(z.string()),
  recommended_action: z.string().min(1),
  analyst_notes: z.string().min(1),
});

const GeminiApiResponseSchema = z.object({
  candidates: z
    .array(
      z.object({
        content: z.object({
          parts: z.array(
            z.object({
              text: z.string().optional(),
            }),
          ),
        }),
      }),
    )
    .optional(),
});

const TenantIdSchema = z.string().uuid();

type ScanRecord = {
  source: "scans";
  id: string;
  target: string | null;
  status: string | null;
  risk_score: number | null;
  verdict: string | null;
  threat_category: string | null;
  total_engines: number | null;
  malicious_count: number | null;
  ai_summary: string | null;
  ai_heuristic: unknown;
  payload: unknown;
  user_id: string | null;
  created_at: string;
  reviewed_by: string | null;
  reviewed_at: string | null;
};

type AlertRecord = {
  source: "wazuh";
  id: string;
  status: string | null;
  rule_level: number | null;
  rule_id: string | null;
  rule_description: string | null;
  rule_groups: string[] | null;
  agent_id: string | null;
  agent_name: string | null;
  agent_ip: string | null;
  src_ip: string | null;
  dest_ip: string | null;
  process_name: string | null;
  process_id: string | null;
  file_path: string | null;
  file_hash_sha256: string | null;
  mitre_technique_id: string | null;
  mitre_tactic: string | null;
  full_payload: unknown;
  created_at: string;
  reviewed_by: string | null;
  reviewed_at: string | null;
};

type QueueRecord = ScanRecord | AlertRecord;

type Decision = z.infer<typeof DecisionSchema>;

type Severity = "low" | "medium" | "high" | "critical";

type EscalationAction =
  | "CLOSE"
  | "ISOLATE_IDENTITY"
  | "BLOCK_IP"
  | "MANUAL_REVIEW";

type ProcessBatchOptions = {
  alertId?: string;
  alertMinAgeMinutes?: number;
  includeScans?: boolean;
  tenantId?: string;
};

const SYSTEM_PROMPT = `You are an expert SOC analyst with 15 years experience in
threat detection. Your job is to triage security alerts with
surgical precision.

You will receive a security alert with the following fields:
- rule_id, rule_level (1-15), rule_description
- agent_name, agent_ip
- mitre_technique, mitre_tactic
- source_ip, destination_ip
- process_name, process_pid
- raw_payload

Analyze the alert and return ONLY valid JSON:
{
  "decision": "CLOSE" | "ESCALATE",
  "severity": "critical" | "high" | "medium" | "low",
  "confidence": 0.0-1.0,
  "reasoning": "detailed explanation referencing specific
    alert fields and why this is or isn't a real threat",
  "mitre_context": "MITRE ATT&CK technique explanation
    if applicable",
  "false_positive_indicators": ["list of reasons this
    might be benign"],
  "threat_indicators": ["list of reasons this is suspicious"],
  "recommended_action": "specific next step for analyst",
  "analyst_notes": "what a senior analyst should know"
}

Rules:
- ESCALATE if rule_level >= 10 OR confidence >= 0.7
  AND clear threat indicators exist
- CLOSE only if you are highly confident (>= 0.85)
  this is a false positive
- When uncertain, always ESCALATE — missing a real threat
  is worse than a false escalation
- Never CLOSE a MITRE-mapped technique without explicit
  false positive evidence
- Confidence must reflect genuine uncertainty`;

function getAdminClient() {
  return createSupabaseAdminClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!,
    { auth: { autoRefreshToken: false, persistSession: false } },
  );
}

function isInternalAgentAuthorized(request: NextRequest): boolean {
  const providedSecret =
    request.headers.get("AGENT_SECRET") ||
    request.headers.get("agent_secret") ||
    request.headers.get("x-agent-secret");

  return Boolean(providedSecret && providedSecret === process.env.AGENT_SECRET);
}

function mapRuleLevelToSeverity(level: number | null): Severity {
  if (level === null) {
    return "low";
  }

  if (level >= 14) {
    return "critical";
  }

  if (level >= 12) {
    return "high";
  }

  if (level >= 9) {
    return "medium";
  }

  return "low";
}

function deriveSeverityFromRecord(record: QueueRecord): Severity {
  if (record.source === "wazuh") {
    return mapRuleLevelToSeverity(record.rule_level);
  }

  const risk = Number(record.risk_score || 0);
  if (risk >= 85) {
    return "critical";
  }
  if (risk >= 70) {
    return "high";
  }
  if (risk >= 35) {
    return "medium";
  }
  return "low";
}

function buildFallbackDecision(record: QueueRecord, error: unknown): Decision {
  const reason =
    error instanceof Error ? error.message : "unknown Gemini error";
  return {
    decision: "ESCALATE",
    severity: deriveSeverityFromRecord(record),
    confidence: 0,
    reasoning: `Gemini unavailable or invalid response (${reason}). Escalating for manual review.`,
    mitre_context: "No MITRE context available due to model failure.",
    false_positive_indicators: [],
    threat_indicators: [
      "Model decision unavailable; escalating to avoid missed threat.",
    ],
    recommended_action: "Escalate to manual review by a senior SOC analyst.",
    analyst_notes:
      "Fallback decision used because Gemini was unavailable or returned invalid output.",
  };
}

function stripCodeFence(text: string): string {
  const trimmed = text.trim();
  if (!trimmed.startsWith("```") || !trimmed.endsWith("```")) {
    return trimmed;
  }

  return trimmed
    .replace(/^```(?:json)?\s*/i, "")
    .replace(/\s*```$/, "")
    .trim();
}

function normalizeEscalationAction(decision: Decision): EscalationAction {
  const recommendation = decision.recommended_action.toUpperCase();

  if (recommendation.includes("BLOCK_IP") || recommendation.includes("BLOCK")) {
    return "BLOCK_IP";
  }

  if (
    recommendation.includes("ISOLATE_IDENTITY") ||
    recommendation.includes("ISOLATE")
  ) {
    return "ISOLATE_IDENTITY";
  }

  if (decision.decision === "CLOSE") {
    return "CLOSE";
  }

  return "MANUAL_REVIEW";
}

async function writeAuditLogSafe(
  adminClient: ReturnType<typeof getAdminClient>,
  action: string,
  severity: Severity,
  metadata: Record<string, unknown>,
  tenantId?: string | null,
) {
  const { error } = await adminClient.from("audit_logs").insert({
    action,
    severity,
    metadata: {
      tenant_id: tenantId || null,
      ...metadata,
    },
    created_at: new Date().toISOString(),
  });

  if (error) {
    console.error("[L1 triage] Failed to write audit log", {
      action,
      details: error.message,
    });
  }
}

async function logWazuhLifecycle(
  adminClient: ReturnType<typeof getAdminClient>,
  stage: "received" | "processed" | "decision" | "action_taken",
  record: AlertRecord,
  tenantId: string | null,
  options?: {
    decision?: Decision;
    actionTaken?: string;
    escalationId?: string | null;
    error?: unknown;
  },
) {
  const actionMap: Record<typeof stage, string> = {
    received: "WAZUH_ALERT_RECEIVED",
    processed: "WAZUH_ALERT_PROCESSED",
    decision: "WAZUH_ALERT_DECISION",
    action_taken: "WAZUH_ALERT_ACTION_TAKEN",
  };

  const severity =
    options?.decision?.severity || mapRuleLevelToSeverity(record.rule_level);
  const errorText =
    options?.error instanceof Error
      ? options.error.message
      : typeof options?.error === "string"
        ? options.error
        : null;

  await writeAuditLogSafe(
    adminClient,
    actionMap[stage],
    severity,
    {
      source: "wazuh",
      alert_id: record.id,
      rule_id: record.rule_id,
      rule_level: record.rule_level,
      rule_description: record.rule_description,
      decision: options?.decision?.decision,
      confidence: options?.decision?.confidence,
      recommended_action: options?.decision?.recommended_action,
      reasoning: options?.decision?.reasoning,
      action_taken: options?.actionTaken || null,
      escalation_id: options?.escalationId || null,
      error: errorText,
    },
    tenantId,
  );
}

function getAuthHeaderValue(request: NextRequest): string {
  return request.headers.get("authorization") || "";
}

function isCronAuthorized(request: NextRequest): boolean {
  const cronSecret = process.env.CRON_SECRET;
  if (!cronSecret) {
    return false;
  }

  return getAuthHeaderValue(request) === `Bearer ${cronSecret}`;
}

async function hasPrivilegedRole(): Promise<boolean> {
  const supabase = await createServerSupabaseClient();
  const {
    data: { user },
    error: authError,
  } = await supabase.auth.getUser();

  if (authError || !user) {
    return false;
  }

  const { data: profile, error: profileError } = await supabase
    .from("profiles")
    .select("role")
    .eq("id", user.id)
    .single();

  if (profileError || !profile) {
    return false;
  }

  return ["admin", "manager", "super_admin"].includes(profile.role);
}

async function fetchUnreviewedScans(
  adminClient: ReturnType<typeof getAdminClient>,
): Promise<{ data: ScanRecord[] | null; error: { message: string } | null }> {
  const sinceIso = new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString();

  const result = await adminClient
    .from("scans")
    .select(
      "id, target, status, risk_score, verdict, threat_category, total_engines, malicious_count, ai_summary, ai_heuristic, payload, user_id, created_at, reviewed_by, reviewed_at",
    )
    .in("status", ["pending", "unreviewed"])
    .gte("created_at", sinceIso)
    .order("created_at", { ascending: true })
    .limit(20);

  if (result.error || !result.data) {
    return {
      data: null,
      error: result.error ? { message: result.error.message } : null,
    };
  }

  return {
    data: result.data.map((scan) => ({
      ...scan,
      source: "scans" as const,
    })),
    error: null,
  };
}

async function fetchPendingWazuhAlerts(
  adminClient: ReturnType<typeof getAdminClient>,
  options: {
    alertId?: string;
    minAgeMinutes?: number;
  } = {},
): Promise<{ data: AlertRecord[] | null; error: { message: string } | null }> {
  const sinceIso = new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString();
  const minAgeMinutes =
    typeof options.minAgeMinutes === "number" && options.minAgeMinutes > 0
      ? options.minAgeMinutes
      : 0;
  const maxCreatedAtIso =
    minAgeMinutes > 0
      ? new Date(Date.now() - minAgeMinutes * 60 * 1000).toISOString()
      : null;

  let query = adminClient
    .from("alerts")
    .select(
      "id, status, source, rule_level, rule_id, rule_description, rule_groups, agent_id, agent_name, agent_ip, src_ip, dest_ip, process_name, process_id, file_path, file_hash_sha256, mitre_technique_id, mitre_tactic, full_payload, created_at, reviewed_by, reviewed_at",
    )
    .eq("status", "pending")
    .eq("source", "wazuh");

  if (options.alertId) {
    query = query.eq("id", options.alertId).limit(1);
  } else {
    query = query
      .gte("created_at", sinceIso)
      .order("rule_level", { ascending: false })
      .order("created_at", { ascending: true })
      .limit(20);
  }

  if (maxCreatedAtIso) {
    query = query.lte("created_at", maxCreatedAtIso);
  }

  const result = await query;

  if (result.error || !result.data) {
    return {
      data: null,
      error: result.error ? { message: result.error.message } : null,
    };
  }

  return {
    data: result.data.map((alert) => ({
      ...alert,
      source: "wazuh" as const,
    })),
    error: null,
  };
}

async function runGeminiTriage(record: QueueRecord): Promise<Decision> {
  try {
    const apiKey = process.env.GEMINI_API_KEY;
    if (!apiKey) {
      throw new Error("Missing GEMINI_API_KEY");
    }

    const response = await fetch(
      `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash:generateContent?key=${apiKey}`,
      {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          systemInstruction: {
            parts: [{ text: SYSTEM_PROMPT }],
          },
          contents: [
            {
              role: "user",
              parts: [{ text: JSON.stringify(record) }],
            },
          ],
        }),
      },
    );

    if (!response.ok) {
      const errorText = await response.text();
      throw new Error(`Gemini call failed (${response.status}): ${errorText}`);
    }

    const rawResponse = await response.json();
    const parsedGemini = GeminiApiResponseSchema.safeParse(rawResponse);
    if (!parsedGemini.success) {
      throw new Error("Gemini response shape validation failed");
    }

    const modelText =
      parsedGemini.data.candidates?.[0]?.content.parts
        .map((part) => part.text || "")
        .join("")
        .trim() || "";

    const decisionJson = JSON.parse(stripCodeFence(modelText));
    const parsedDecision = DecisionSchema.safeParse(decisionJson);
    if (!parsedDecision.success) {
      throw new Error("Decision schema validation failed");
    }

    return parsedDecision.data;
  } catch (error) {
    console.warn("[L1 triage] Gemini failed, using graceful fallback", {
      source: record.source,
      record_id: record.id,
      error: error instanceof Error ? error.message : "unknown",
    });
    return buildFallbackDecision(record, error);
  }
}

async function escalateScan(
  record: QueueRecord,
  decision: Decision,
  baseUrl: string,
  tenantId: string | null,
): Promise<{ escalationId: string | null }> {
  const title =
    record.source === "wazuh"
      ? `L1 Agent Escalation: ${record.rule_description || record.rule_id || record.id}`
      : `L1 Agent Escalation: ${record.target || record.id}`;

  const affectedIp =
    record.source === "wazuh"
      ? record.src_ip || record.dest_ip || record.agent_ip || null
      : null;

  const affectedUserId =
    record.source === "scans" ? record.user_id || undefined : undefined;

  const response = await fetch(`${baseUrl}/api/actions/escalate`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      AGENT_SECRET: process.env.AGENT_SECRET || "",
    },
    body: JSON.stringify({
      alertId: record.id,
      severity: decision.severity,
      title,
      description: decision.reasoning,
      affectedUserId,
      affectedIp,
      tenantId: tenantId || undefined,
      recommendedAction: normalizeEscalationAction(decision),
      telemetrySnapshot: {
        ...(record as Record<string, unknown>),
        tenant_id: tenantId || null,
      },
    }),
  });

  if (!response.ok) {
    const details = await response.text();
    throw new Error(
      `Escalation endpoint failed (${response.status}): ${details}`,
    );
  }

  let escalationId: string | null = null;
  try {
    const payload = (await response.json()) as { escalation_id?: unknown };
    escalationId =
      typeof payload.escalation_id === "string" ? payload.escalation_id : null;
  } catch {
    escalationId = null;
  }

  return { escalationId };
}

async function processBatch(
  request: NextRequest,
  options: ProcessBatchOptions = {},
) {
  const adminClient = getAdminClient();
  const tenantId = options.tenantId || null;
  const includeScans = options.includeScans ?? !options.alertId;
  const alertMinAgeMinutes =
    typeof options.alertMinAgeMinutes === "number" &&
    options.alertMinAgeMinutes >= 0
      ? options.alertMinAgeMinutes
      : 0;

  const scansResult = includeScans
    ? await fetchUnreviewedScans(adminClient)
    : { data: [] as ScanRecord[], error: null as { message: string } | null };

  const { data: scans, error: scansError } = scansResult;
  const { data: alerts, error: alertsError } = await fetchPendingWazuhAlerts(
    adminClient,
    {
      alertId: options.alertId,
      minAgeMinutes: alertMinAgeMinutes,
    },
  );

  if (scansError || alertsError) {
    return NextResponse.json(
      {
        success: false,
        error:
          scansError?.message ||
          alertsError?.message ||
          "Failed to fetch queue",
      },
      { status: 500 },
    );
  }

  let processed = 0;
  let closed = 0;
  let escalated = 0;
  let errors = 0;

  const results: Array<{
    item_id: string;
    alert_id: string | null;
    scan_id: string | null;
    tenant_id: string | null;
    source: QueueRecord["source"];
    decision: Decision["decision"];
    confidence: number;
    severity: Decision["severity"];
    reasoning: string;
    recommended_action: Decision["recommended_action"];
    escalation_id: string | null;
  }> = [];

  const baseUrl = process.env.INTERNAL_API_URL ?? request.nextUrl.origin;
  const queue: QueueRecord[] = [...(alerts || []), ...(scans || [])];

  for (const item of queue) {
    let decision: Decision | null = null;

    try {
      if (item.source === "wazuh") {
        await logWazuhLifecycle(adminClient, "received", item, tenantId);
        await logWazuhLifecycle(adminClient, "processed", item, tenantId);
      }

      decision = await runGeminiTriage(item);

      if (item.source === "wazuh") {
        await logWazuhLifecycle(adminClient, "decision", item, tenantId, {
          decision,
        });
      }

      const reviewedAt = new Date().toISOString();

      if (decision.decision === "CLOSE") {
        const updateQuery =
          item.source === "wazuh"
            ? adminClient
                .from("alerts")
                .update({
                  status: "auto_closed",
                  reviewed_by: "l1_agent",
                  reviewed_at: reviewedAt,
                })
                .eq("id", item.id)
            : adminClient
                .from("scans")
                .update({
                  status: "auto_closed",
                  reviewed_by: "l1_agent",
                  reviewed_at: reviewedAt,
                })
                .eq("id", item.id);

        const { error: updateError } = await updateQuery;

        if (updateError) {
          throw new Error(
            `Failed to auto-close ${item.source} record ${item.id}: ${updateError.message}`,
          );
        }

        const { error: auditError } = await adminClient
          .from("audit_logs")
          .insert({
            action: "L1_AUTO_CLOSED",
            severity: decision.severity,
            metadata: {
              tenant_id: tenantId,
              source: item.source,
              record_id: item.id,
              reasoning: decision.reasoning,
              confidence: decision.confidence,
            },
            reviewed_by: "l1_agent",
            created_at: reviewedAt,
          });

        if (auditError) {
          throw new Error(
            `Failed to write auto-close audit log for ${item.source} record ${item.id}: ${auditError.message}`,
          );
        }

        if (item.source === "wazuh") {
          await logWazuhLifecycle(adminClient, "action_taken", item, tenantId, {
            decision,
            actionTaken: "CLOSE",
          });
        }

        closed += 1;

        results.push({
          item_id: item.id,
          alert_id: item.source === "wazuh" ? item.id : null,
          scan_id: item.source === "scans" ? item.id : null,
          tenant_id: tenantId,
          source: item.source,
          decision: decision.decision,
          confidence: decision.confidence,
          severity: decision.severity,
          reasoning: decision.reasoning,
          recommended_action: decision.recommended_action,
          escalation_id: null,
        });
      } else {
        const escalationResult = await escalateScan(
          item,
          decision,
          baseUrl,
          tenantId,
        );

        const updateQuery =
          item.source === "wazuh"
            ? adminClient
                .from("alerts")
                .update({
                  status: "escalated",
                  reviewed_by: "l1_agent",
                  reviewed_at: reviewedAt,
                })
                .eq("id", item.id)
            : adminClient
                .from("scans")
                .update({
                  status: "escalated",
                  reviewed_by: "l1_agent",
                  reviewed_at: reviewedAt,
                })
                .eq("id", item.id);

        const { error: updateError } = await updateQuery;

        if (updateError) {
          throw new Error(
            `Failed to mark ${item.source} record ${item.id} escalated: ${updateError.message}`,
          );
        }

        if (item.source === "wazuh") {
          await logWazuhLifecycle(adminClient, "action_taken", item, tenantId, {
            decision,
            actionTaken: "ESCALATE",
            escalationId: escalationResult.escalationId,
          });
        }

        escalated += 1;

        results.push({
          item_id: item.id,
          alert_id: item.source === "wazuh" ? item.id : null,
          scan_id: item.source === "scans" ? item.id : null,
          tenant_id: tenantId,
          source: item.source,
          decision: decision.decision,
          confidence: decision.confidence,
          severity: decision.severity,
          reasoning: decision.reasoning,
          recommended_action: decision.recommended_action,
          escalation_id: escalationResult.escalationId,
        });
      }

      processed += 1;
    } catch (error) {
      errors += 1;

      if (item.source === "wazuh") {
        await logWazuhLifecycle(adminClient, "action_taken", item, tenantId, {
          decision: decision || undefined,
          actionTaken: "ERROR",
          error,
        });
      }

      console.error("[L1 triage] Failed to process record", {
        source: item.source,
        record_id: item.id,
        error,
      });
    }
  }

  return NextResponse.json({
    success: true,
    tenant_id: tenantId,
    processed,
    closed,
    escalated,
    errors,
    results,
  });
}

export async function GET(request: NextRequest) {
  if (!isCronAuthorized(request)) {
    return NextResponse.json(
      { success: false, error: "Unauthorized" },
      { status: 401 },
    );
  }

  const alertId = request.nextUrl.searchParams.get("alert_id") || undefined;
  const includeScansParam = request.nextUrl.searchParams.get("include_scans");
  const includeScans =
    includeScansParam === null
      ? undefined
      : includeScansParam.toLowerCase() === "true";
  const minAgeRaw = request.nextUrl.searchParams.get("alert_min_age_minutes");
  const parsedMinAge = minAgeRaw ? Number(minAgeRaw) : NaN;
  const alertMinAgeMinutes = Number.isFinite(parsedMinAge)
    ? Math.max(0, parsedMinAge)
    : undefined;
  const tenantParam =
    request.nextUrl.searchParams.get("tenant_id") || undefined;
  let tenantId: string | undefined;

  if (tenantParam) {
    const parsedTenant = TenantIdSchema.safeParse(tenantParam);
    if (!parsedTenant.success) {
      return NextResponse.json(
        { success: false, error: "Invalid tenant_id" },
        { status: 400 },
      );
    }

    tenantId = parsedTenant.data;
  }

  return processBatch(request, {
    alertId,
    includeScans,
    alertMinAgeMinutes,
    tenantId,
  });
}

export async function POST(request: NextRequest) {
  if (!isInternalAgentAuthorized(request)) {
    const authorized = await hasPrivilegedRole();
    if (!authorized) {
      return NextResponse.json(
        { success: false, error: "Forbidden: insufficient privileges" },
        { status: 403 },
      );
    }
  }

  let body: Record<string, unknown> = {};

  try {
    const parsed = (await request.json()) as Record<string, unknown>;
    body = parsed && typeof parsed === "object" ? parsed : {};
  } catch {
    body = {};
  }

  const alertId =
    typeof body.alert_id === "string" && body.alert_id.trim().length > 0
      ? body.alert_id.trim()
      : undefined;
  const includeScans =
    typeof body.include_scans === "boolean" ? body.include_scans : undefined;
  const parsedMinAge =
    typeof body.alert_min_age_minutes === "number"
      ? body.alert_min_age_minutes
      : typeof body.alert_min_age_minutes === "string"
        ? Number(body.alert_min_age_minutes)
        : NaN;
  const alertMinAgeMinutes = Number.isFinite(parsedMinAge)
    ? Math.max(0, parsedMinAge)
    : undefined;
  const tenantIdRaw =
    typeof body.tenant_id === "string" && body.tenant_id.trim().length > 0
      ? body.tenant_id.trim()
      : undefined;
  let tenantId: string | undefined;

  if (tenantIdRaw) {
    const parsedTenant = TenantIdSchema.safeParse(tenantIdRaw);
    if (!parsedTenant.success) {
      return NextResponse.json(
        { success: false, error: "Invalid tenant_id" },
        { status: 400 },
      );
    }

    tenantId = parsedTenant.data;
  }

  return processBatch(request, {
    alertId,
    includeScans,
    alertMinAgeMinutes,
    tenantId,
  });
}
