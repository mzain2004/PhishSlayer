import { NextResponse } from "next/server";
import { auth } from "@clerk/nextjs/server";
import { createClient } from "@/lib/supabase/server";
import { apiSuccess, apiError, apiPaginated, API_CODES } from "@/lib/api/response";

export const dynamic = 'force-dynamic';
export const runtime = 'nodejs';

export async function GET(req: Request) {
  const { userId } = await auth();
  if (!userId) return apiError(API_CODES.UNAUTHORIZED, "Unauthorized", 401);

  const { searchParams } = new URL(req.url);
  const page = Math.max(1, parseInt(searchParams.get('page') || '1'));
  const limit = Math.min(200, Math.max(1, parseInt(searchParams.get('limit') || '50')));
  const offset = (page - 1) * limit;

  const supabase = await createClient();

  // Get organization for the user
  const { data: membership } = await supabase
    .from("organization_members")
    .select("organization_id")
    .eq("user_id", userId)
    .limit(1)
    .maybeSingle();

  if (!membership) return apiError(API_CODES.NOT_FOUND, "No organization found", 404);

  const { data: alerts, error, count } = await supabase
    .from("alerts")
    .select("id, org_id, source, status, severity, rule_level, cluster_id, queue_priority, created_at, acknowledged_at, assigned_to", { count: 'exact' })
    .eq("org_id", membership.organization_id)
    .order("queue_priority", { ascending: false })
    .order("created_at", { ascending: false })
    .range(offset, offset + limit - 1);

  if (error) return apiError(API_CODES.INTERNAL_ERROR, "Internal server error", 500);

  // Add computed field: triage_age_seconds: seconds since created_at if not acknowledged
  const now = new Date();
  const enhancedAlerts = (alerts || []).map(alert => ({
    ...alert,
    triage_age_seconds: alert.acknowledged_at 
      ? null 
      : Math.floor((now.getTime() - new Date(alert.created_at).getTime()) / 1000)
  }));

  return apiPaginated(enhancedAlerts, count || 0, page, limit);
}
