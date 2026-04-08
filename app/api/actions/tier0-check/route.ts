import { NextRequest, NextResponse } from "next/server";
import { createClient as createSupabaseAdminClient } from "@supabase/supabase-js";
import { createServerClient } from "@supabase/ssr";
import { cookies } from "next/headers";
import { z } from "zod";
import { runTier0Prevention } from "@/lib/prevention/tier0Engine";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

const Tier0PayloadSchema = z.object({
  scanPayload: z.record(z.string(), z.unknown()),
});

function getAdminClient() {
  return createSupabaseAdminClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!,
    { auth: { autoRefreshToken: false, persistSession: false } },
  );
}

async function isAuthorized(request: NextRequest): Promise<boolean> {
  const agentSecretHeader =
    request.headers.get("AGENT_SECRET") ||
    request.headers.get("agent_secret") ||
    request.headers.get("x-agent-secret");

  if (
    Boolean(agentSecretHeader) &&
    agentSecretHeader === process.env.AGENT_SECRET
  ) {
    return true;
  }

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
    data: { user },
    error: authError,
  } = await callerClient.auth.getUser();

  if (authError || !user) {
    return false;
  }

  const { data: profile, error: profileError } = await callerClient
    .from("profiles")
    .select("role")
    .eq("id", user.id)
    .single();

  if (profileError || !profile) {
    return false;
  }

  return ["admin", "manager", "super_admin"].includes(profile.role);
}

export async function POST(request: NextRequest) {
  if (!(await isAuthorized(request))) {
    return NextResponse.json(
      { success: false, error: "Unauthorized" },
      { status: 401 },
    );
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

  const parsed = Tier0PayloadSchema.safeParse(body);
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

  const { scanPayload } = parsed.data;
  const result = await runTier0Prevention(scanPayload);

  if (result.verdict === "BLOCKED") {
    const adminClient = getAdminClient();
    const payload = scanPayload as {
      id?: string;
      destination_ip?: string;
      url?: string;
      target?: string;
    };

    const scanId = payload.id || null;
    if (scanId) {
      await adminClient
        .from("scans")
        .update({
          status: "tier0_blocked",
          tier0_blocked: true,
          rule_triggered: result.rule_triggered,
        })
        .eq("id", scanId);
    }

    await adminClient.from("audit_logs").insert({
      action: "TIER0_BLOCK",
      severity: "high",
      metadata: {
        rule_triggered: result.rule_triggered,
        reason: result.reason,
        scan_id: scanId,
        scan_url: payload.url || payload.target || null,
      },
      created_at: new Date().toISOString(),
    });

    if (payload.destination_ip) {
      await adminClient.from("blocked_ips").insert({
        ip: payload.destination_ip,
        reason: result.rule_triggered,
        threat_level: "high",
        blocked_by: null,
        created_at: new Date().toISOString(),
      });
    }
  }

  return NextResponse.json(result);
}
