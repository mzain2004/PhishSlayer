import { NextRequest, NextResponse } from "next/server";
import { createClient as createSupabaseAdminClient } from "@supabase/supabase-js";
import { createServerClient } from "@supabase/ssr";
import { cookies } from "next/headers";
import { z } from "zod";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

const ParamsSchema = z.object({
  id: z.string().uuid(),
});

function getAdminClient() {
  return createSupabaseAdminClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!,
    { auth: { autoRefreshToken: false, persistSession: false } },
  );
}

async function getAuthorizedUserId(): Promise<string | null> {
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
    return null;
  }

  const { data: profile, error: profileError } = await callerClient
    .from("profiles")
    .select("role")
    .eq("id", user.id)
    .single();

  if (profileError || !profile) {
    return null;
  }

  if (!["admin", "manager", "super_admin"].includes(profile.role)) {
    return null;
  }

  return user.id;
}

export async function PATCH(
  request: NextRequest,
  context: { params: Promise<{ id: string }> },
) {
  const userId = await getAuthorizedUserId();
  if (!userId) {
    return NextResponse.json(
      { success: false, error: "Forbidden: insufficient privileges" },
      { status: 403 },
    );
  }

  const params = await context.params;
  const parsedParams = ParamsSchema.safeParse(params);
  if (!parsedParams.success) {
    return NextResponse.json(
      { success: false, error: "Invalid escalation id" },
      { status: 400 },
    );
  }

  const escalationId = parsedParams.data.id;
  const adminClient = getAdminClient();

  const { data: escalation, error: fetchError } = await adminClient
    .from("escalations")
    .select(
      "id, title, severity, status, recommended_action, affected_user_id, affected_ip",
    )
    .eq("id", escalationId)
    .single();

  if (fetchError || !escalation) {
    return NextResponse.json(
      { success: false, error: "Escalation not found" },
      { status: 404 },
    );
  }

  const resolvedAt = new Date().toISOString();
  const { error: updateError } = await adminClient
    .from("escalations")
    .update({ status: "approved", resolved_at: resolvedAt })
    .eq("id", escalationId);

  if (updateError) {
    return NextResponse.json(
      {
        success: false,
        error: "Failed to approve escalation",
        details: updateError.message,
      },
      { status: 500 },
    );
  }

  let actionFired: string | null = null;

  if (
    escalation.recommended_action === "ISOLATE_IDENTITY" &&
    escalation.affected_user_id
  ) {
    const response = await fetch(
      `${request.nextUrl.origin}/api/actions/isolate-identity`,
      {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          cookie: request.headers.get("cookie") || "",
        },
        body: JSON.stringify({
          targetUserId: escalation.affected_user_id,
          reason: escalation.title,
        }),
      },
    );

    if (response.ok) {
      actionFired = "ISOLATE_IDENTITY";
    }
  }

  if (escalation.recommended_action === "BLOCK_IP" && escalation.affected_ip) {
    const response = await fetch(
      `${request.nextUrl.origin}/api/actions/block-ip`,
      {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          cookie: request.headers.get("cookie") || "",
        },
        body: JSON.stringify({
          ip: escalation.affected_ip,
          reason: escalation.title,
          threatLevel: escalation.severity,
        }),
      },
    );

    if (response.ok) {
      actionFired = "BLOCK_IP";
    }
  }

  await adminClient.from("audit_logs").insert({
    action: "ESCALATION_APPROVED",
    severity: escalation.severity,
    metadata: {
      escalation_id: escalationId,
      recommended_action: escalation.recommended_action,
      action_fired: actionFired,
    },
    actor_id: userId,
    created_at: resolvedAt,
  });

  return NextResponse.json({
    success: true,
    escalation_id: escalationId,
    action_fired: actionFired,
  });
}
