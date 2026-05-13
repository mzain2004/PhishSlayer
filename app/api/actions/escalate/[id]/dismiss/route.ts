import { NextRequest, NextResponse } from "next/server";
import { createClient as createSupabaseAdminClient } from "@supabase/supabase-js";
import { createServerClient } from "@supabase/ssr";
import { cookies } from "next/headers";
import { z } from "zod";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

const ParamsSchema = z.object({
  id: z.string().uuid(),
}).strict();

function getAdminClient() {
  return createSupabaseAdminClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!,
    { auth: { autoRefreshToken: false, persistSession: false } },
  );
}

import { auth } from '@clerk/nextjs/server';

export async function PATCH(
  request: NextRequest,
  context: { params: Promise<{ id: string }> },
) {
  const { userId, orgId } = await auth();
  if (!userId) {
    return NextResponse.json(
      { success: false, error: "Unauthorized" },
      { status: 401 },
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
  const resolvedAt = new Date().toISOString();

  const { data: escalation, error: fetchError } = await adminClient
    .from("escalations")
    .select("id, severity, organization_id")
    .eq("id", escalationId)
    .single();

  if (fetchError || !escalation) {
    return NextResponse.json(
      { success: false, error: "Escalation not found" },
      { status: 404 },
    );
  }

  const organizationId = escalation.organization_id || null;

  const { error: updateError } = await adminClient
    .from("escalations")
    .update({ status: "dismissed", resolved_at: resolvedAt })
    .eq("id", escalationId);

  if (updateError) {
    return NextResponse.json(
      {
        success: false,
        error: "Failed to dismiss escalation",
        details: updateError.message,
      },
      { status: 500 },
    );
  }

  await adminClient.from("audit_logs").insert({
    action: "ESCALATION_DISMISSED",
    severity: escalation.severity,
    organization_id: organizationId,
    metadata: {
      escalation_id: escalationId,
      organization_id: organizationId,
    },
    actor_id: userId,
    created_at: resolvedAt,
  });

  return NextResponse.json({
    success: true,
    escalation_id: escalationId,
  });
}
