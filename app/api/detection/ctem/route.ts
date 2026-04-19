import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";
import { z } from "zod";
import { getAuthenticatedUser, resolveTenantForUser } from "@/lib/tenancy";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

const PostSchema = z.object({
  organization_id: z.string().uuid().optional(),
  asset_name: z.string().min(1),
  asset_type: z.enum([
    "server",
    "endpoint",
    "network",
    "identity",
    "application",
  ]),
  exposure_type: z.string().min(1),
  severity: z.enum(["critical", "high", "medium", "low"]),
  description: z.string().min(1),
  remediation: z.string().optional(),
  alert_id: z.string().uuid().optional(),
});

const QuerySchema = z.object({
  organization_id: z.string().uuid().optional(),
  page: z.coerce.number().int().min(1).default(1),
  limit: z.coerce.number().int().min(1).max(100).default(20),
  status: z.enum(["open", "in_progress", "resolved", "accepted"]).optional(),
  severity: z.enum(["critical", "high", "medium", "low"]).optional(),
});

function getAdminClient() {
  return createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!,
    { auth: { autoRefreshToken: false, persistSession: false } },
  );
}

export async function POST(request: NextRequest) {
  try {
    const user = await getAuthenticatedUser();
    if (!user) {
      return NextResponse.json(
        { success: false, error: "Unauthorized" },
        { status: 401 },
      );
    }

    const payload = await request.json();
    const parsed = PostSchema.safeParse(payload);

    if (!parsed.success) {
      return NextResponse.json(
        {
          success: false,
          error: "Invalid payload",
          details: parsed.error.flatten(),
        },
        { status: 400 },
      );
    }

    const tenant = await resolveTenantForUser({
      userId: user.id,
      preferredTenantId: parsed.data.organization_id,
      autoCreate: false,
    });

    if (!tenant || !["owner", "admin"].includes(tenant.role)) {
      return NextResponse.json(
        { success: false, error: "Forbidden" },
        { status: 403 },
      );
    }

    const adminClient = getAdminClient();
    const now = new Date().toISOString();
    const body = parsed.data;

    const { data, error } = await adminClient
      .from("ctem_exposures")
      .upsert(
        {
          organization_id: tenant.tenantId,
          asset_name: body.asset_name,
          asset_type: body.asset_type,
          exposure_type: body.exposure_type,
          severity: body.severity,
          description: body.description,
          remediation: body.remediation || null,
          alert_id: body.alert_id || null,
          status: "open",
          last_seen: now,
        },
        { onConflict: "organization_id,asset_name,exposure_type" },
      )
      .select("*")
      .single();

    if (error || !data) {
      return NextResponse.json(
        {
          success: false,
          error: `Failed to upsert CTEM exposure: ${error?.message || "unknown"}`,
        },
        { status: 500 },
      );
    }

    return NextResponse.json({ success: true, exposure: data });
  } catch (error) {
    return NextResponse.json(
      {
        success: false,
        error:
          error instanceof Error ? error.message : "Failed to create exposure",
      },
      { status: 500 },
    );
  }
}

export async function GET(request: NextRequest) {
  try {
    const user = await getAuthenticatedUser();
    if (!user) {
      return NextResponse.json(
        { success: false, error: "Unauthorized" },
        { status: 401 },
      );
    }

    const { searchParams } = new URL(request.url);
    const parsedQuery = QuerySchema.safeParse({
      organization_id: searchParams.get("organization_id") ?? undefined,
      page: searchParams.get("page") ?? "1",
      limit: searchParams.get("limit") ?? "20",
      status: searchParams.get("status") ?? undefined,
      severity: searchParams.get("severity") ?? undefined,
    });

    if (!parsedQuery.success) {
      return NextResponse.json(
        {
          success: false,
          error: "Invalid query parameters",
          details: parsedQuery.error.flatten(),
        },
        { status: 400 },
      );
    }

    const { page, limit, status, severity, organization_id } = parsedQuery.data;
    const tenant = await resolveTenantForUser({
      userId: user.id,
      preferredTenantId: organization_id,
      autoCreate: false,
    });

    if (!tenant) {
      return NextResponse.json(
        { success: false, error: "Forbidden" },
        { status: 403 },
      );
    }
    const from = (page - 1) * limit;
    const to = from + limit - 1;

    const adminClient = getAdminClient();
    let query = adminClient
      .from("ctem_exposures")
      .select("*", { count: "exact" })
      .eq("organization_id", tenant.tenantId)
      .order("last_seen", { ascending: false })
      .range(from, to);

    if (status) {
      query = query.eq("status", status);
    }

    if (severity) {
      query = query.eq("severity", severity);
    }

    const { data, error, count } = await query;

    if (error) {
      return NextResponse.json(
        {
          success: false,
          error: `Failed to fetch exposures: ${error.message}`,
        },
        { status: 500 },
      );
    }

    const { data: severityRows, error: severityError } = await adminClient
      .from("ctem_exposures")
      .select("severity")
      .eq("organization_id", tenant.tenantId);

    if (severityError) {
      return NextResponse.json(
        {
          success: false,
          error: `Failed to calculate severity counts: ${severityError.message}`,
        },
        { status: 500 },
      );
    }

    const severityCounts = (severityRows || []).reduce(
      (acc, row) => {
        const key = row.severity as
          | "critical"
          | "high"
          | "medium"
          | "low"
          | null;
        if (key) {
          acc[key] = (acc[key] || 0) + 1;
        }
        return acc;
      },
      { critical: 0, high: 0, medium: 0, low: 0 } as Record<string, number>,
    );

    return NextResponse.json({
      success: true,
      data: data || [],
      count: count || 0,
      page,
      limit,
      severity_counts: severityCounts,
    });
  } catch (error) {
    return NextResponse.json(
      {
        success: false,
        error:
          error instanceof Error ? error.message : "Failed to list exposures",
      },
      { status: 500 },
    );
  }
}
