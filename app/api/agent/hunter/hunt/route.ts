import { NextRequest, NextResponse } from "next/server";
import { createClient as createSupabaseAdminClient } from "@supabase/supabase-js";
import { z } from "zod";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

const HunterDecisionSchema = z.object({
  is_hit: z.boolean(),
  confidence: z.number().min(0).max(1),
  severity: z.enum(["low", "medium", "high", "critical"]),
  reasoning: z.string().min(1),
  recommended_action: z.enum([
    "CLOSE",
    "ISOLATE_IDENTITY",
    "BLOCK_IP",
    "MANUAL_REVIEW",
  ]),
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

type IntelRow = {
  id: string;
  ioc_type: string;
  ioc_value: string;
  threat_type: string | null;
  source: string;
  tags: unknown;
  malware: string | null;
  raw_data: unknown;
};

type HunterDecision = z.infer<typeof HunterDecisionSchema>;

const HUNTER_PROMPT = `You are an autonomous Tier 3 Threat Hunter for Phish-Slayer.
You have found a historical scan that matches a known IOC from
a fresh threat intelligence feed. Determine if this represents
an undetected historical compromise.
Respond ONLY with valid JSON:
{
  'is_hit': true or false,
  'confidence': float 0.0 to 1.0,
  'severity': 'low' or 'medium' or 'high' or 'critical',
  'reasoning': 'one sentence max',
  'recommended_action': 'CLOSE' or 'ISOLATE_IDENTITY'
    or 'BLOCK_IP' or 'MANUAL_REVIEW'
}
Rules:
- is_hit: true only if confidence >= 0.75
- Respond with raw JSON only. No markdown.`;

function getAdminClient() {
  return createSupabaseAdminClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!,
    { auth: { autoRefreshToken: false, persistSession: false } },
  );
}

function getCycleId(request: NextRequest): string | null {
  const value = request.headers.get("x-l3-cycle-id");
  return value && value.trim().length > 0 ? value.trim() : null;
}

function isAuthorized(request: NextRequest): boolean {
  return (
    Boolean(process.env.CRON_SECRET) &&
    request.headers.get("authorization") === `Bearer ${process.env.CRON_SECRET}`
  );
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

function normalizeDecision(decision: HunterDecision): HunterDecision {
  if (!decision.is_hit || decision.confidence < 0.75) {
    return {
      ...decision,
      is_hit: false,
      recommended_action: "MANUAL_REVIEW",
    };
  }

  return decision;
}

function fallbackHunterDecision(
  ioc: IntelRow,
  scan: Record<string, unknown>,
  reason: string,
): HunterDecision {
  const riskScore =
    typeof scan.risk_score === "number" && Number.isFinite(scan.risk_score)
      ? scan.risk_score
      : 0;

  const severity: HunterDecision["severity"] =
    riskScore >= 85 ||
    /malware|trojan|ransom|phish/i.test(ioc.threat_type || "")
      ? "high"
      : "medium";

  return {
    is_hit: true,
    confidence: 0.76,
    severity,
    reasoning: `gemini_unavailable_heuristic_match: ${reason}`,
    recommended_action: "MANUAL_REVIEW",
  };
}

async function queryMatchingScans(
  adminClient: ReturnType<typeof getAdminClient>,
  iocType: string,
  iocValue: string,
): Promise<Record<string, unknown>[]> {
  const pattern = `%${iocValue}%`;

  const primaryOr =
    iocType === "ip"
      ? `url.ilike.${pattern},target.ilike.${pattern},ai_summary.ilike.${pattern}`
      : `url.ilike.${pattern},target.ilike.${pattern}`;

  const primary = await adminClient
    .from("scans")
    .select("*")
    .or(primaryOr)
    .limit(10);

  if (!primary.error) {
    return (primary.data || []) as Record<string, unknown>[];
  }

  const fallback = await adminClient
    .from("scans")
    .select("*")
    .ilike("target", pattern)
    .limit(10);

  if (fallback.error) {
    throw new Error(
      `Scan correlation failed for IOC ${iocValue}: ${fallback.error.message}`,
    );
  }

  return (fallback.data || []) as Record<string, unknown>[];
}

async function callGemini(
  ioc: IntelRow,
  scan: Record<string, unknown>,
): Promise<HunterDecision> {
  if (!process.env.GEMINI_API_KEY) {
    throw new Error("Missing GEMINI_API_KEY");
  }

  const response = await fetch(
    `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash:generateContent?key=${process.env.GEMINI_API_KEY}`,
    {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        systemInstruction: {
          parts: [{ text: HUNTER_PROMPT }],
        },
        contents: [
          {
            role: "user",
            parts: [
              {
                text: JSON.stringify({
                  ioc,
                  matched_scan: scan,
                }),
              },
            ],
          },
        ],
      }),
    },
  );

  if (!response.ok) {
    const details = await response.text();
    throw new Error(
      `Gemini hunter request failed (${response.status}): ${details}`,
    );
  }

  const payload = await response.json();
  const parsed = GeminiApiResponseSchema.safeParse(payload);
  if (!parsed.success) {
    throw new Error("Gemini hunter response shape invalid");
  }

  const text =
    parsed.data.candidates?.[0]?.content.parts
      .map((part) => part.text || "")
      .join("")
      .trim() || "";

  const cleaned = stripCodeFence(text);

  let json: unknown;
  try {
    json = JSON.parse(cleaned);
  } catch {
    throw new Error("Gemini hunter response was not valid JSON");
  }

  const decision = HunterDecisionSchema.safeParse(json);
  if (!decision.success) {
    throw new Error("Gemini hunter decision schema validation failed");
  }

  return normalizeDecision(decision.data);
}

async function callGeminiWithFallback(
  ioc: IntelRow,
  scan: Record<string, unknown>,
): Promise<{
  decision: HunterDecision;
  usedFallback: boolean;
  fallbackReason: string | null;
}> {
  try {
    const decision = await callGemini(ioc, scan);
    return { decision, usedFallback: false, fallbackReason: null };
  } catch (error) {
    const fallbackReason =
      error instanceof Error ? error.message : "unknown_gemini_error";
    const decision = fallbackHunterDecision(ioc, scan, fallbackReason);
    return {
      decision,
      usedFallback: true,
      fallbackReason,
    };
  }
}

export async function GET(request: NextRequest) {
  if (!isAuthorized(request)) {
    return NextResponse.json(
      { success: false, error: "Unauthorized" },
      { status: 401 },
    );
  }

  const adminClient = getAdminClient();
  const baseUrl = request.nextUrl.origin;
  const cycleId = getCycleId(request);

  const { data: intelRows, error: intelError } = await adminClient
    .from("threat_intel")
    .select(
      "id, ioc_type, ioc_value, threat_type, source, tags, malware, raw_data",
    )
    .eq("hunted", false)
    .limit(50);

  if (intelError) {
    return NextResponse.json(
      {
        success: false,
        error: `Failed to fetch threat_intel rows: ${intelError.message}`,
      },
      { status: 500 },
    );
  }

  const iocs = (intelRows || []) as IntelRow[];

  let iocsProcessed = 0;
  let scansCrossReferenced = 0;
  let hitsFound = 0;
  let escalationsCreated = 0;
  let errors = 0;

  for (const ioc of iocs) {
    try {
      const scans = await queryMatchingScans(
        adminClient,
        ioc.ioc_type,
        ioc.ioc_value,
      );
      scansCrossReferenced += scans.length;

      for (const scan of scans) {
        try {
          const { decision, usedFallback, fallbackReason } =
            await callGeminiWithFallback(ioc, scan);

          if (usedFallback) {
            await adminClient.from("audit_logs").insert({
              action: "L3_STAGE_FAILURE",
              severity: "medium",
              metadata: {
                stage: "hunt",
                failure_type: "gemini_failure",
                cycle_id: cycleId,
                ioc_id: ioc.id,
                scan_id: String(scan.id || "unknown"),
                error: fallbackReason,
              },
              created_at: new Date().toISOString(),
            });
          }

          if (!decision.is_hit) {
            continue;
          }

          hitsFound += 1;

          const scanId = String(scan.id || "unknown");
          const affectedUserId =
            typeof scan.user_id === "string" && scan.user_id.length > 0
              ? scan.user_id
              : undefined;

          const escalationResponse = await fetch(
            `${baseUrl}/api/actions/escalate`,
            {
              method: "POST",
              headers: {
                "Content-Type": "application/json",
                AGENT_SECRET: process.env.AGENT_SECRET || "",
              },
              body: JSON.stringify({
                alertId: `L3-HUNT-${scanId}`,
                severity: decision.severity,
                title: `L3 Hunter: Retroactive IOC Match - ${ioc.ioc_value}`,
                description: decision.reasoning,
                affectedUserId,
                recommendedAction: decision.recommended_action,
                telemetrySnapshot: {
                  ioc,
                  scan,
                  hunter_confidence: decision.confidence,
                },
              }),
            },
          );

          if (!escalationResponse.ok) {
            const details = await escalationResponse.text();
            throw new Error(
              `Escalation create failed (${escalationResponse.status}): ${details}`,
            );
          }

          escalationsCreated += 1;

          await adminClient
            .from("scans")
            .update({ status: "retroactive_hit" })
            .eq("id", scanId);

          await adminClient.from("audit_logs").insert({
            action: "L3_HUNT_HIT",
            severity: decision.severity,
            metadata: {
              cycle_id: cycleId,
              ioc_id: ioc.id,
              ioc_value: ioc.ioc_value,
              scan_id: scanId,
              confidence: decision.confidence,
              reasoning: decision.reasoning,
            },
          });

          await adminClient.from("hunt_findings").insert({
            hunt_type: "campaign_cluster",
            severity: decision.severity,
            confidence: decision.confidence,
            title: `L3 IOC correlation: ${ioc.ioc_value}`,
            description: decision.reasoning,
            indicators: {
              cycle_id: cycleId,
              ioc_id: ioc.id,
              ioc_type: ioc.ioc_type,
              ioc_value: ioc.ioc_value,
              source: ioc.source,
              recommended_action: decision.recommended_action,
              halt_reason: null,
            },
            source_records: [scanId],
            escalated: true,
            escalation_id: null,
            created_by: "l3_agent",
            created_at: new Date().toISOString(),
          });
        } catch (scanError) {
          errors += 1;
          console.error("[L3 hunter] scan processing error", {
            ioc_id: ioc.id,
            scan_id: scan.id,
            error: scanError,
          });
        }
      }
    } catch (iocError) {
      errors += 1;
      console.error("[L3 hunter] IOC processing error", {
        ioc_id: ioc.id,
        error: iocError,
      });
    } finally {
      await adminClient
        .from("threat_intel")
        .update({ hunted: true })
        .eq("id", ioc.id);
      iocsProcessed += 1;
    }
  }

  return NextResponse.json({
    success: true,
    iocs_processed: iocsProcessed,
    scans_cross_referenced: scansCrossReferenced,
    hits_found: hitsFound,
    escalations_created: escalationsCreated,
    errors,
  });
}
