import { NextRequest, NextResponse } from "next/server";
import { createClient as createSupabaseAdminClient } from "@supabase/supabase-js";
import { createClient as createServerSupabaseClient } from "@/lib/supabase/server";
import { z } from "zod";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

const FunctionNameSchema = z.enum([
  "isolate_identity",
  "block_ip",
  "escalate_for_review",
]);

const IsolateArgsSchema = z.object({
  targetUserId: z.string().uuid(),
  reason: z.string().min(1),
});

const BlockIpArgsSchema = z.object({
  ip: z.string().min(1),
  reason: z.string().min(1),
  threatLevel: z.enum(["low", "medium", "high", "critical"]),
});

const EscalateReviewArgsSchema = z.object({
  reason: z.string().min(1),
});

const GeminiResponseSchema = z.object({
  candidates: z
    .array(
      z.object({
        content: z.object({
          parts: z.array(
            z.object({
              functionCall: z
                .object({
                  name: z.string().optional(),
                  args: z.record(z.string(), z.unknown()).optional(),
                })
                .optional(),
              text: z.string().optional(),
            }),
          ),
        }),
      }),
    )
    .optional(),
});

type EscalationRow = {
  id: string;
  severity: "low" | "medium" | "high" | "critical";
  title: string;
  description: string;
  affected_user_id: string | null;
  affected_ip: string | null;
  recommended_action:
    | "CLOSE"
    | "ISOLATE_IDENTITY"
    | "BLOCK_IP"
    | "MANUAL_REVIEW";
  status: string;
  telemetry_snapshot: Record<string, unknown> | null;
  created_at: string;
  [key: string]: unknown;
};

type NormalizedFunctionCall = {
  name: z.infer<typeof FunctionNameSchema>;
  args: Record<string, unknown>;
};

const SYSTEM_PROMPT = `You are an autonomous Tier 2 SOC Incident Responder for Phish-Slayer.
You receive escalated security alerts and must decide the exact
remediation action to take. You have access to three response tools.
Analyze the alert and call the most appropriate tool.
Rules:
- If a user identity is compromised or session hijacked: call isolate_identity
- If a malicious IP or domain is the threat vector: call block_ip
- If threat is ambiguous or requires investigation: call escalate_for_review
- Always call exactly one tool. Never respond with plain text.`;

const TOOLS_PAYLOAD = [
  {
    functionDeclarations: [
      {
        name: "isolate_identity",
        description:
          "Isolates a compromised user account, revokes all sessions and bans them",
        parameters: {
          type: "OBJECT",
          properties: {
            targetUserId: {
              type: "STRING",
              description: "UUID of the user to isolate",
            },
            reason: {
              type: "STRING",
              description: "Why this identity is being isolated",
            },
          },
          required: ["targetUserId", "reason"],
        },
      },
      {
        name: "block_ip",
        description: "Blocks a malicious IP address on Cloudflare WAF",
        parameters: {
          type: "OBJECT",
          properties: {
            ip: {
              type: "STRING",
              description: "IPv4 or IPv6 address to block",
            },
            reason: {
              type: "STRING",
              description: "Why this IP is being blocked",
            },
            threatLevel: {
              type: "STRING",
              description: "low | medium | high | critical",
            },
          },
          required: ["ip", "reason", "threatLevel"],
        },
      },
      {
        name: "escalate_for_review",
        description:
          "Flags the alert for mandatory human review when threat is ambiguous",
        parameters: {
          type: "OBJECT",
          properties: {
            reason: {
              type: "STRING",
              description: "Why human review is needed",
            },
          },
          required: ["reason"],
        },
      },
    ],
  },
];

function getAdminClient() {
  return createSupabaseAdminClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!,
    { auth: { autoRefreshToken: false, persistSession: false } },
  );
}

function isCronAuthorized(request: NextRequest): boolean {
  const cronSecret = process.env.CRON_SECRET;
  if (!cronSecret) {
    return false;
  }

  return request.headers.get("authorization") === `Bearer ${cronSecret}`;
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

async function fetchPendingEscalations(
  adminClient: ReturnType<typeof getAdminClient>,
) {
  return adminClient
    .from("escalations")
    .select("*")
    .eq("status", "pending")
    .order("created_at", { ascending: true })
    .limit(10);
}

function fallbackFunctionCall(reason: string): NormalizedFunctionCall {
  return {
    name: "escalate_for_review",
    args: { reason },
  };
}

async function runGeminiFunctionCall(
  escalation: EscalationRow,
): Promise<NormalizedFunctionCall> {
  const apiKey = process.env.GEMINI_API_KEY;
  if (!apiKey) {
    throw new Error("Missing GEMINI_API_KEY");
  }

  const response = await fetch(
    `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash:generateContent?key=${apiKey}`,
    {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        systemInstruction: {
          parts: [{ text: SYSTEM_PROMPT }],
        },
        tools: TOOLS_PAYLOAD,
        contents: [
          {
            role: "user",
            parts: [
              {
                text: JSON.stringify(escalation),
              },
            ],
          },
        ],
      }),
    },
  );

  if (!response.ok) {
    const text = await response.text();
    throw new Error(
      `Gemini function call failed (${response.status}): ${text}`,
    );
  }

  const raw = await response.json();
  const parsed = GeminiResponseSchema.safeParse(raw);
  if (!parsed.success) {
    return fallbackFunctionCall(
      "Gemini returned ambiguous response — manual review required",
    );
  }

  const parts = parsed.data.candidates?.[0]?.content.parts || [];
  const functionPart = parts.find((part) => part.functionCall);
  const functionCall = functionPart?.functionCall;

  if (!functionCall?.name) {
    return fallbackFunctionCall(
      "Gemini returned ambiguous response — manual review required",
    );
  }

  const nameParse = FunctionNameSchema.safeParse(functionCall.name);
  if (!nameParse.success) {
    return fallbackFunctionCall(
      "Gemini returned ambiguous response — manual review required",
    );
  }

  return {
    name: nameParse.data,
    args: functionCall.args || {},
  };
}

function mapToRecommendedAction(
  name: z.infer<typeof FunctionNameSchema>,
): "ISOLATE_IDENTITY" | "BLOCK_IP" | "MANUAL_REVIEW" {
  if (name === "isolate_identity") {
    return "ISOLATE_IDENTITY";
  }
  if (name === "block_ip") {
    return "BLOCK_IP";
  }
  return "MANUAL_REVIEW";
}

async function processBatch(request: NextRequest) {
  const adminClient = getAdminClient();
  const { data: escalations, error: escalationError } =
    await fetchPendingEscalations(adminClient);

  if (escalationError) {
    return NextResponse.json(
      { success: false, error: escalationError.message },
      { status: 500 },
    );
  }

  const hitlMode = (process.env.HITL_MODE || "true").toLowerCase() !== "false";
  const baseUrl = request.nextUrl.origin;
  let processed = 0;

  const results: Array<{
    escalation_id: string;
    function_called: z.infer<typeof FunctionNameSchema>;
    args: Record<string, unknown>;
    action_fired: boolean;
  }> = [];

  for (const escalation of (escalations || []) as EscalationRow[]) {
    try {
      const functionCall = await runGeminiFunctionCall(escalation);

      if (
        functionCall.name === "isolate_identity" &&
        !escalation.affected_user_id
      ) {
        continue;
      }

      let actionFired = false;

      if (hitlMode) {
        const escalationResponse = await fetch(
          `${baseUrl}/api/actions/escalate`,
          {
            method: "POST",
            headers: {
              "Content-Type": "application/json",
              AGENT_SECRET: process.env.AGENT_SECRET || "",
            },
            body: JSON.stringify({
              alertId: escalation.id,
              severity: escalation.severity,
              title: `L2 Recommends: ${functionCall.name}`,
              description:
                "L2 Agent recommendation awaiting approval. Args: " +
                JSON.stringify(functionCall.args),
              recommendedAction: mapToRecommendedAction(functionCall.name),
              affectedUserId: escalation.affected_user_id || undefined,
              affectedIp: escalation.affected_ip || undefined,
              telemetrySnapshot: {
                function_call: functionCall,
                original: escalation,
              },
            }),
          },
        );

        if (!escalationResponse.ok) {
          const details = await escalationResponse.text();
          throw new Error(`Failed to create HITL escalation: ${details}`);
        }

        const { error: updateError } = await adminClient
          .from("escalations")
          .update({
            status: "l2_pending_approval",
            resolved_by: "l2_agent",
            l2_function_called: functionCall.name,
            l2_function_args: functionCall.args,
          })
          .eq("id", escalation.id);

        if (updateError) {
          throw new Error(
            `Failed to update escalation ${escalation.id}: ${updateError.message}`,
          );
        }
      } else {
        if (functionCall.name === "isolate_identity") {
          const args = IsolateArgsSchema.parse(functionCall.args);
          const actionResponse = await fetch(
            `${baseUrl}/api/actions/isolate-identity`,
            {
              method: "POST",
              headers: {
                "Content-Type": "application/json",
                AGENT_SECRET: process.env.AGENT_SECRET || "",
              },
              body: JSON.stringify({
                targetUserId: args.targetUserId,
                reason: args.reason,
              }),
            },
          );

          if (!actionResponse.ok) {
            const details = await actionResponse.text();
            throw new Error(`isolate_identity failed: ${details}`);
          }
          actionFired = true;
        }

        if (functionCall.name === "block_ip") {
          const args = BlockIpArgsSchema.parse(functionCall.args);
          const actionResponse = await fetch(
            `${baseUrl}/api/actions/block-ip`,
            {
              method: "POST",
              headers: {
                "Content-Type": "application/json",
                AGENT_SECRET: process.env.AGENT_SECRET || "",
              },
              body: JSON.stringify({
                ip: args.ip,
                reason: args.reason,
                threatLevel: args.threatLevel,
              }),
            },
          );

          if (!actionResponse.ok) {
            const details = await actionResponse.text();
            throw new Error(`block_ip failed: ${details}`);
          }
          actionFired = true;
        }

        if (functionCall.name === "escalate_for_review") {
          const args = EscalateReviewArgsSchema.parse(functionCall.args);
          const actionResponse = await fetch(
            `${baseUrl}/api/actions/escalate`,
            {
              method: "POST",
              headers: {
                "Content-Type": "application/json",
                AGENT_SECRET: process.env.AGENT_SECRET || "",
              },
              body: JSON.stringify({
                alertId: escalation.id,
                severity: escalation.severity,
                title: "L2 Manual Review Required",
                description: args.reason,
                recommendedAction: "MANUAL_REVIEW",
                affectedUserId: escalation.affected_user_id || undefined,
                affectedIp: escalation.affected_ip || undefined,
                telemetrySnapshot: {
                  function_call: functionCall,
                  original: escalation,
                },
              }),
            },
          );

          if (!actionResponse.ok) {
            const details = await actionResponse.text();
            throw new Error(`escalate_for_review failed: ${details}`);
          }
          actionFired = true;
        }

        const { error: updateError } = await adminClient
          .from("escalations")
          .update({
            status: "l2_auto_resolved",
            resolved_by: "l2_agent",
            l2_function_called: functionCall.name,
            l2_function_args: functionCall.args,
          })
          .eq("id", escalation.id);

        if (updateError) {
          throw new Error(
            `Failed to update escalation ${escalation.id}: ${updateError.message}`,
          );
        }
      }

      await adminClient.from("audit_logs").insert({
        action: "L2_DECISION",
        severity: escalation.severity,
        metadata: {
          escalation_id: escalation.id,
          function_called: functionCall.name,
          function_args: functionCall.args,
          hitl_mode: String(hitlMode),
          action_fired: actionFired,
        },
        created_at: new Date().toISOString(),
      });

      processed += 1;
      results.push({
        escalation_id: escalation.id,
        function_called: functionCall.name,
        args: functionCall.args,
        action_fired: actionFired,
      });
    } catch (error) {
      console.error("[L2 respond] Failed processing escalation", {
        escalation_id: escalation.id,
        error,
      });
    }
  }

  return NextResponse.json({
    success: true,
    processed,
    hitl_mode: hitlMode,
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

  return processBatch(request);
}

export async function POST(request: NextRequest) {
  const allowed = await hasPrivilegedRole();
  if (!allowed) {
    return NextResponse.json(
      { success: false, error: "Forbidden: insufficient privileges" },
      { status: 403 },
    );
  }

  return processBatch(request);
}
