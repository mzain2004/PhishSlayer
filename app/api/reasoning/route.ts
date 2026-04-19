import { NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";
import { z } from "zod";
import { getAuthenticatedUser, resolveTenantForUser } from "@/lib/tenancy";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

const QuerySchema = z.object({
  organization_id: z.string().uuid().optional(),
  page: z.coerce.number().int().min(1).default(1),
  limit: z.coerce.number().int().min(1).max(100).default(20),
  agent_level: z.enum(["L1", "L2", "L3"]).optional(),
  alert_id: z.string().uuid().optional(),
});

function getAdminClient() {
  return createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!,
    { auth: { autoRefreshToken: false, persistSession: false } },
  );
}

export async function GET(request: Request) {
  const user = await getAuthenticatedUser();
  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { searchParams } = new URL(request.url);
  const parsedQuery = QuerySchema.safeParse({
    organization_id: searchParams.get("organization_id") ?? undefined,
    page: searchParams.get("page") ?? "1",
    limit: searchParams.get("limit") ?? "20",
    agent_level: searchParams.get("agent_level") ?? undefined,
    alert_id: searchParams.get("alert_id") ?? undefined,
  });

  if (!parsedQuery.success) {
    return NextResponse.json(
      {
        error: "Invalid query parameters",
        details: parsedQuery.error.flatten(),
      },
      { status: 400 },
    );
  }

  const { page, limit, agent_level, alert_id, organization_id } =
    parsedQuery.data;
  const tenant = await resolveTenantForUser({
    userId: user.id,
    preferredTenantId: organization_id,
    autoCreate: false,
  });

  if (!tenant) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }
  const from = (page - 1) * limit;
  const to = from + limit - 1;

  const supabase = getAdminClient();

  let query = supabase
    .from("agent_reasoning")
    .select("*", { count: "exact" })
    .eq("organization_id", tenant.tenantId)
    .order("created_at", { ascending: false })
    .range(from, to);

  if (agent_level) {
    query = query.eq("agent_level", agent_level);
  }

  if (alert_id) {
    query = query.eq("alert_id", alert_id);
  }

  const { data, error, count } = await query;

  if (error) {
    return NextResponse.json(
      {
        error: "Failed to fetch reasoning chains",
        details: error.message,
      },
      { status: 500 },
    );
  }

  return NextResponse.json({
    data: data || [],
    count: count || 0,
    page,
    limit,
  });
}
