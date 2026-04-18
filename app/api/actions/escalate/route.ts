import { NextRequest, NextResponse } from "next/server";
import { createClient as createSupabaseAdminClient } from "@supabase/supabase-js";
import { createServerClient } from "@supabase/ssr";
import { cookies } from "next/headers";
import { z } from "zod";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

const EscalatePayloadSchema = z.object({
  alertId: z.string().min(1, { message: "alertId is required" }),
  severity: z.enum(["low", "medium", "high", "critical"]),
  title: z.string().min(1, { message: "title is required" }),
  description: z.string().min(1, { message: "description is required" }),
  affectedUserId: z.string().uuid().optional(),
  affectedIp: z.string().optional(),
  tenantId: z.string().uuid().optional(),
  recommendedAction: z.enum([
    "CLOSE",
    "ISOLATE_IDENTITY",
    "BLOCK_IP",
    "MANUAL_REVIEW",
  ]),
  telemetrySnapshot: z.record(z.string(), z.unknown()).optional(),
});

const severityColorMap: Record<"low" | "medium" | "high" | "critical", number> =
  {
    critical: 16711680,
    high: 16744272,
    medium: 16776960,
    low: 3329330,
  };

export async function POST(request: NextRequest) {
  const cookieStore = await cookies();
  const agentSecretHeader =
    request.headers.get("AGENT_SECRET") ||
    request.headers.get("agent_secret") ||
    request.headers.get("x-agent-secret");
  const internalAuth =
    Boolean(agentSecretHeader) &&
    agentSecretHeader === process.env.AGENT_SECRET;

  let callerUserId: string | null = null;

  if (!internalAuth) {
    const callerClient = createServerClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
      {
        cookies: {
          get(name: string) {
            return cookieStore.get(name)?.value;
          },
        },
      },
    );

    const {
      data: { user: callerUser },
      error: authError,
    } = await callerClient.auth.getUser();

    if (authError || !callerUser) {
      return NextResponse.json(
        { success: false, error: "Unauthorized" },
        { status: 401 },
      );
    }

    const { data: callerProfile, error: profileError } = await callerClient
      .from("profiles")
      .select("role")
      .eq("id", callerUser.id)
      .single();

    if (profileError || !callerProfile) {
      return NextResponse.json(
        { success: false, error: "Could not verify caller role" },
        { status: 403 },
      );
    }

    if (
      !(["admin", "manager", "super_admin"] as const).includes(
        callerProfile.role,
      )
    ) {
      return NextResponse.json(
        { success: false, error: "Forbidden: insufficient privileges" },
        { status: 403 },
      );
    }

    callerUserId = callerUser.id;
  }

  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json(
      { success: false, error: "Invalid JSON body" },
      { status: 400 },
    );
  }

  const parsed = EscalatePayloadSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json(
      {
        success: false,
        error: "Validation failed",
        details: parsed.error.flatten(),
      },
      { status: 400 },
    );
  }

  const payload = parsed.data;
  const webhookUrl = process.env.DISCORD_ESCALATION_WEBHOOK_URL;

  let discordNotified = false;

  if (webhookUrl) {
    const embedFields: Array<{
      name: string;
      value: string;
      inline?: boolean;
    }> = [
      { name: "Alert ID", value: payload.alertId, inline: true },
      { name: "Severity", value: payload.severity.toUpperCase(), inline: true },
      { name: "Title", value: payload.title },
      { name: "Description", value: payload.description },
      {
        name: "Affected User",
        value: payload.affectedUserId || "N/A",
        inline: true,
      },
      {
        name: "Affected IP",
        value: payload.affectedIp || "N/A",
        inline: true,
      },
      {
        name: "Recommended Action",
        value: payload.recommendedAction,
        inline: true,
      },
      {
        name: "Timestamp",
        value: new Date().toISOString(),
        inline: true,
      },
    ];

    if (
      payload.recommendedAction === "ISOLATE_IDENTITY" ||
      payload.recommendedAction === "BLOCK_IP"
    ) {
      embedFields.push({
        name: "⚠️ Warning",
        value:
          "⚠️ L2 Agent recommends automated execution. Awaiting human approval.",
      });
    }

    try {
      const discordResponse = await fetch(webhookUrl, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          embeds: [
            {
              title: "SOC Escalation",
              color: severityColorMap[payload.severity],
              fields: embedFields,
              footer: {
                text: "Phish-Slayer Autonomous SOC | L1 Agent Escalation",
              },
              timestamp: new Date().toISOString(),
            },
          ],
        }),
      });

      discordNotified = discordResponse.ok;
    } catch {
      discordNotified = false;
    }
  }

  const adminClient = createSupabaseAdminClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!,
    { auth: { autoRefreshToken: false, persistSession: false } },
  );

  // MCP SCHEMA CHECK: verify table 'escalations' has columns:
  // [alert_id, severity, title, description, affected_user_id, affected_ip, recommended_action, telemetry_snapshot, discord_notified, status, created_at]
  // Run in Supabase SQL Editor before deploying:
  // SELECT column_name FROM information_schema.columns
  // WHERE table_name = 'escalations';
  const { data: escalationRow, error: escalationError } = await adminClient
    .from("escalations")
    .insert({
      alert_id: payload.alertId,
      severity: payload.severity,
      title: payload.title,
      description: payload.description,
      affected_user_id: payload.affectedUserId ?? null,
      affected_ip: payload.affectedIp ?? null,
      recommended_action: payload.recommendedAction,
      telemetry_snapshot: payload.telemetrySnapshot ?? null,
      discord_notified: discordNotified,
      status: "pending",
      created_at: new Date().toISOString(),
    })
    .select("id")
    .single();

  if (escalationError) {
    return NextResponse.json(
      {
        success: false,
        error: "Failed to persist escalation",
        details: escalationError.message,
      },
      { status: 500 },
    );
  }

  // MCP SCHEMA CHECK: verify table 'audit_logs' has columns:
  // [action, severity, metadata, actor_id, created_at]
  // Run in Supabase SQL Editor before deploying:
  // SELECT column_name FROM information_schema.columns
  // WHERE table_name = 'audit_logs';
  const { error: auditError } = await adminClient.from("audit_logs").insert({
    action: "ALERT_ESCALATED",
    severity: payload.severity,
    metadata: {
      alertId: payload.alertId,
      tenant_id: payload.tenantId || null,
      recommendedAction: payload.recommendedAction,
      discord_notified: discordNotified,
    },
    actor_id: callerUserId,
    created_at: new Date().toISOString(),
  });

  return NextResponse.json({
    success: true,
    escalation_id: escalationRow.id,
    discord_notified: discordNotified,
    audit_logged: !auditError,
  });
}
