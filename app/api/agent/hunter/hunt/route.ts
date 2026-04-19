import { NextRequest, NextResponse } from "next/server";
import { createClient as createSupabaseAdminClient } from "@supabase/supabase-js";
import { z } from "zod";
import { groqComplete } from "@/lib/ai/groq";
import { sanitizePromptInput } from "@/lib/security/sanitize";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

const HunterFindingSchema = z.object({
  finding_type: z.enum([
    "lateral_movement",
    "c2_communication",
    "persistence",
    "data_exfiltration",
    "initial_access",
    "credential_theft",
  ]),
  confidence: z.number().min(0).max(1),
  severity: z.enum(["low", "medium", "high", "critical"]),
  description: z.string().min(1),
  iocs_involved: z.array(z.string()),
  mitre_techniques: z.array(z.string()),
  recommended_action: z.string().min(1),
  hunt_queries: z.array(z.string()),
});

const HunterDecisionSchema = z.object({
  findings: z.array(HunterFindingSchema),
  attack_narrative: z.string().min(1),
  confidence_overall: z.number().min(0).max(1),
  priority: z.enum(["immediate", "high", "medium", "monitor"]),
  analyst_briefing: z.string().min(1),
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
type HunterFinding = z.infer<typeof HunterFindingSchema>;

const HUNTER_PROMPT = `You are a threat hunter conducting proactive hunt operations.
Your job is to find attack patterns humans would miss.

You will receive:
- IOCs ingested from threat feeds (URLhaus, ThreatFox, OpenPhish)
- Correlated scan and alert records
- L2 context (what triggered this hunt and why)
- Historical findings from previous hunts

Your job:
1. Identify patterns across multiple IOCs
2. Find relationships between seemingly unrelated alerts
3. Detect lateral movement indicators
4. Identify persistence mechanisms
5. Find C2 communication patterns

Return ONLY valid JSON:
{
  "findings": [
    {
      "finding_type": "lateral_movement" | "c2_communication" |
        "persistence" | "data_exfiltration" | "initial_access" |
        "credential_theft",
      "confidence": 0.0-1.0,
      "severity": "critical" | "high" | "medium" | "low",
      "description": "detailed finding with specific IOC references",
      "iocs_involved": ["list of specific IOCs"],
      "mitre_techniques": ["T1234.001 format"],
      "recommended_action": "specific containment or investigation step",
      "hunt_queries": ["specific queries analyst should run"]
    }
  ],
  "attack_narrative": "overall story of what the attacker
    appears to be doing based on all evidence",
  "confidence_overall": 0.0-1.0,
  "priority": "immediate" | "high" | "medium" | "monitor",
  "analyst_briefing": "3-sentence executive summary"
}

Rules:
- Only report findings with confidence >= 0.6
- Always connect findings to specific IOC evidence
- If no patterns found, return empty findings array
  with honest explanation
- Never fabricate IOC correlations`;

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

function getOrganizationId(request: NextRequest): string | null {
  const value = request.nextUrl.searchParams.get("organization_id");
  if (!value || value.trim().length === 0) {
    return null;
  }

  const parsed = z.string().uuid().safeParse(value.trim());
  return parsed.success ? parsed.data : null;
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
  const findings = decision.findings.filter(
    (finding) => finding.confidence >= 0.6,
  );
  return {
    ...decision,
    findings,
  };
}

function fallbackHunterDecision(
  _ioc: IntelRow,
  _scan: Record<string, unknown>,
  reason: string,
): HunterDecision {
  return {
    findings: [],
    attack_narrative: `No reliable hunt narrative due to model failure: ${reason}`,
    confidence_overall: 0,
    priority: "monitor",
    analyst_briefing:
      "Model unavailable; no automated hunt findings were emitted.",
  };
}

function highestSeverity(
  findings: HunterFinding[],
): "low" | "medium" | "high" | "critical" {
  if (findings.some((finding) => finding.severity === "critical")) {
    return "critical";
  }
  if (findings.some((finding) => finding.severity === "high")) {
    return "high";
  }
  if (findings.some((finding) => finding.severity === "medium")) {
    return "medium";
  }
  return "low";
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
  if (!process.env.GROQ_API_KEY) {
    throw new Error("Missing GROQ_API_KEY");
  }

  const text = await groqComplete(
    HUNTER_PROMPT,
    sanitizePromptInput(
      JSON.stringify({
        ioc,
        matched_scan: scan,
        l2_context: {
          trigger: "retroactive_ioc_match",
        },
        historical_findings: [],
      }),
      4000,
    ),
  );

  const cleaned = stripCodeFence(text);

  let json: unknown;
  try {
    json = JSON.parse(cleaned);
  } catch {
    throw new Error("Groq hunter response was not valid JSON");
  }

  const decision = HunterDecisionSchema.safeParse(json);
  if (!decision.success) {
    throw new Error("Groq hunter decision schema validation failed");
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
  const organizationId = getOrganizationId(request);
  const minAgeRaw = request.nextUrl.searchParams.get("min_age_minutes");
  const parsedMinAge = minAgeRaw ? Number(minAgeRaw) : NaN;
  const minAgeMinutes = Number.isFinite(parsedMinAge)
    ? Math.max(0, parsedMinAge)
    : 0;

  let intelQuery = adminClient
    .from("threat_intel")
    .select(
      "id, ioc_type, ioc_value, threat_type, source, tags, malware, raw_data",
    )
    .eq("hunted", false)
    .limit(50);

  if (minAgeMinutes > 0) {
    const cutoffIso = new Date(
      Date.now() - minAgeMinutes * 60 * 1000,
    ).toISOString();
    intelQuery = intelQuery.lte("ingested_at", cutoffIso);
  }

  const { data: intelRows, error: intelError } = await intelQuery;

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
              organization_id: organizationId,
              metadata: {
                stage: "hunt",
                failure_type: "gemini_failure",
                cycle_id: cycleId,
                organization_id: organizationId,
                ioc_id: ioc.id,
                scan_id: String(scan.id || "unknown"),
                error: fallbackReason,
              },
              created_at: new Date().toISOString(),
            });
          }

          if (decision.findings.length === 0) {
            continue;
          }

          hitsFound += 1;

          const severity = highestSeverity(decision.findings);
          const primaryFinding = decision.findings[0];
          const findingSummary = decision.findings
            .map((finding) => finding.description)
            .join(" | ")
            .slice(0, 1500);

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
                severity,
                title: `L3 Hunter: ${primaryFinding.finding_type} pattern - ${ioc.ioc_value}`,
                description: `${decision.analyst_briefing} Narrative: ${decision.attack_narrative}. Findings: ${findingSummary}`,
                affectedUserId,
                organization_id: organizationId,
                recommendedAction: "MANUAL_REVIEW",
                telemetrySnapshot: {
                  organization_id: organizationId,
                  ioc,
                  scan,
                  hunter_output: decision,
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
            severity,
            organization_id: organizationId,
            metadata: {
              cycle_id: cycleId,
              organization_id: organizationId,
              ioc_id: ioc.id,
              ioc_value: ioc.ioc_value,
              scan_id: scanId,
              confidence: decision.confidence_overall,
              attack_narrative: decision.attack_narrative,
              findings_count: decision.findings.length,
              priority: decision.priority,
            },
          });

          await adminClient.from("hunt_findings").insert({
            hunt_type: "campaign_cluster",
            severity,
            confidence: decision.confidence_overall,
            title: `L3 IOC correlation: ${ioc.ioc_value}`,
            description: `${decision.analyst_briefing} Narrative: ${decision.attack_narrative}`,
            indicators: {
              cycle_id: cycleId,
              ioc_id: ioc.id,
              ioc_type: ioc.ioc_type,
              ioc_value: ioc.ioc_value,
              source: ioc.source,
              findings: decision.findings,
              recommended_action: "MANUAL_REVIEW",
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
    min_age_minutes: minAgeMinutes,
    iocs_processed: iocsProcessed,
    scans_cross_referenced: scansCrossReferenced,
    hits_found: hitsFound,
    escalations_created: escalationsCreated,
    errors,
  });
}
