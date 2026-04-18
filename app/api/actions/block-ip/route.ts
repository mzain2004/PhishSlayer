import { NextRequest, NextResponse } from "next/server";
import { createClient as createSupabaseAdminClient } from "@supabase/supabase-js";
import { createServerClient } from "@supabase/ssr";
import { cookies } from "next/headers";
import { z } from "zod";
import { isIP } from "node:net";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

const BlockIpPayloadSchema = z.object({
  ip: z.string().refine((value) => isIP(value) !== 0, {
    message: "ip must be a valid IPv4 or IPv6",
  }),
  reason: z.string().min(1, { message: "reason is required" }),
  threatLevel: z.enum(["low", "medium", "high", "critical"]),
  tenantId: z.string().uuid().optional().nullable(),
});

function mapThreatToAuditSeverity(
  threatLevel: "low" | "medium" | "high" | "critical",
) {
  if (threatLevel === "critical" || threatLevel === "high") {
    return "critical";
  }
  if (threatLevel === "medium") {
    return "high";
  }
  return "medium";
}

export async function POST(request: NextRequest) {
  const agentSecretHeader =
    request.headers.get("AGENT_SECRET") ||
    request.headers.get("agent_secret") ||
    request.headers.get("x-agent-secret");
  const internalAuth =
    Boolean(agentSecretHeader) &&
    agentSecretHeader === process.env.AGENT_SECRET;

  let callerUserId: string | null = null;

  if (!internalAuth) {
    const cookieStore = await cookies();
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

  const parsed = BlockIpPayloadSchema.safeParse(body);
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

  const { ip, reason, threatLevel, tenantId } = parsed.data;
  const cfToken = process.env.CLOUDFLARE_API_TOKEN;
  const cfZoneId = process.env.CLOUDFLARE_ZONE_ID;

  let cloudflareBlocked = false;
  let cloudflareRuleId: string | null = null;

  if (cfToken && cfZoneId) {
    try {
      const firewallResponse = await fetch(
        `https://api.cloudflare.com/client/v4/zones/${cfZoneId}/firewall/rules`,
        {
          method: "POST",
          headers: {
            Authorization: `Bearer ${cfToken}`,
            "Content-Type": "application/json",
          },
          body: JSON.stringify([
            {
              filter: {
                expression: `(ip.src eq \"${ip}\")`,
                paused: false,
                description: `Phish-Slayer Auto-Block: ${reason}`,
              },
              action: "block",
              description: `Phish-Slayer Auto-Block: ${reason}`,
              paused: false,
            },
          ]),
        },
      );

      const firewallPayload = await firewallResponse.json();
      const firewallSuccess = Boolean(firewallPayload?.success);

      if (firewallSuccess) {
        cloudflareRuleId =
          firewallPayload?.result?.[0]?.id ??
          firewallPayload?.result?.id ??
          null;
        cloudflareBlocked = true;
      }
    } catch {
      cloudflareBlocked = false;
    }

    try {
      const accessRuleResponse = await fetch(
        `https://api.cloudflare.com/client/v4/zones/${cfZoneId}/firewall/access-rules/rules`,
        {
          method: "POST",
          headers: {
            Authorization: `Bearer ${cfToken}`,
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            mode: "block",
            configuration: {
              target: "ip",
              value: ip,
            },
            notes: `Phish-Slayer Auto-Block: ${reason}`,
          }),
        },
      );

      const accessRulePayload = await accessRuleResponse.json();
      if (accessRulePayload?.success) {
        cloudflareBlocked = true;
        if (!cloudflareRuleId) {
          cloudflareRuleId = accessRulePayload?.result?.id ?? null;
        }
      }
    } catch {
      // Non-fatal fallback failure
    }
  }

  const adminClient = createSupabaseAdminClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!,
    { auth: { autoRefreshToken: false, persistSession: false } },
  );

  // MCP SCHEMA CHECK: verify table 'blocked_ips' has columns:
  // [ip, reason, threat_level, blocked_by, cloudflare_rule_id, created_at]
  // Run in Supabase SQL Editor before deploying:
  // SELECT column_name FROM information_schema.columns
  // WHERE table_name = 'blocked_ips';
  const { error: blockedIpInsertError } = await adminClient
    .from("blocked_ips")
    .insert({
      ip,
      reason,
      threat_level: threatLevel,
      blocked_by: callerUserId,
      cloudflare_rule_id: cloudflareRuleId,
      created_at: new Date().toISOString(),
    });

  if (blockedIpInsertError) {
    return NextResponse.json(
      {
        success: false,
        error: "Failed to persist blocked IP record",
        details: blockedIpInsertError.message,
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
    action: "IP_BLOCKED",
    severity: mapThreatToAuditSeverity(threatLevel),
    metadata: {
      tenant_id: tenantId || null,
      ip,
      reason,
      cloudflare_rule_id: cloudflareRuleId,
      threat_level: threatLevel,
    },
    actor_id: callerUserId,
    created_at: new Date().toISOString(),
  });

  return NextResponse.json({
    success: true,
    ip,
    cloudflare_blocked: cloudflareBlocked,
    cloudflare_rule_id: cloudflareRuleId,
    audit_logged: !auditError,
  });
}
