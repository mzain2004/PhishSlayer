import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { calculateDailyMetrics, getMetricsSummary } from "@/lib/soc-metrics";
import { getAuthenticatedUser, resolveTenantForUser } from "@/lib/tenancy";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

const TriggerMetricsSchema = z.object({
  organization_id: z.string().uuid().optional(),
});

function isCronAuthorized(request: NextRequest): boolean {
  const cronSecret = process.env.CRON_SECRET;
  if (!cronSecret) {
    return false;
  }

  const authHeader = request.headers.get("authorization") || "";
  return authHeader === `Bearer ${cronSecret}`;
}

export async function GET() {
  try {
    const user = await getAuthenticatedUser();
    if (!user) {
      return NextResponse.json(
        { success: false, error: "Unauthorized" },
        { status: 401 },
      );
    }

    const tenant = await resolveTenantForUser({ userId: user.id });
    if (!tenant) {
      return NextResponse.json(
        { success: false, error: "Forbidden" },
        { status: 403 },
      );
    }

    const summary = await getMetricsSummary(tenant.tenantId);
    return NextResponse.json({ success: true, ...summary });
  } catch (error) {
    return NextResponse.json(
      {
        success: false,
        error:
          error instanceof Error
            ? error.message
            : "Failed to fetch KPI metrics",
      },
      { status: 500 },
    );
  }
}

export async function POST(request: NextRequest) {
  if (!isCronAuthorized(request)) {
    return NextResponse.json(
      { success: false, error: "Unauthorized" },
      { status: 401 },
    );
  }

  try {
    const payload: unknown = await request.json().catch(() => ({}));

    const parsed = TriggerMetricsSchema.safeParse(payload);
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

    const metrics = await calculateDailyMetrics(parsed.data.organization_id);
    return NextResponse.json({ success: true, metrics });
  } catch (error) {
    return NextResponse.json(
      {
        success: false,
        error:
          error instanceof Error
            ? error.message
            : "Failed to calculate SOC metrics",
      },
      { status: 500 },
    );
  }
}
