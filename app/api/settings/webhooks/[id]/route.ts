import { NextRequest, NextResponse } from "next/server";
import { auth } from "@clerk/nextjs/server";
import { supabaseAdmin } from "@/lib/supabase/admin";
import { apiSuccess, apiError, API_CODES } from "@/lib/api/response";
import { requireRole } from "@/lib/security/rbac";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

export async function DELETE(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  const guard = await requireRole(["org:owner", "org:admin"]);
  if (!guard.ok) return guard.response;

  const { orgId } = guard;

  const { id } = await params;

  const { error } = await supabaseAdmin
    .from("webhook_endpoints")
    .delete()
    .eq("id", id)
    .eq("org_id", orgId);

  if (error)
    return apiError(API_CODES.INTERNAL_ERROR, "Internal server error", 500);

  return apiSuccess({ success: true });
}
