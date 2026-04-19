import { NextResponse } from "next/server";
import { z } from "zod";
import { createClient } from "@/lib/supabase/server";
import { fetchRecentSignIns } from "@/lib/microsoft/signInIngestion";
import { fetchPrivilegeEvents } from "@/lib/microsoft/privilegeTracking";
import { buildIdentityChain } from "@/lib/microsoft/chainBuilder";
import { buildTimeline, calculateMTTR } from "@/lib/microsoft/timelineBuilder";
import { detectAnomalies } from "@/lib/microsoft/anomalyDetector";
import { getServerRole } from "@/lib/rbac/serverRole";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

const querySchema = z.object({
  hours: z.coerce.number().int().min(1).max(168).default(24),
});

export async function GET(request: Request) {
  try {
    const supabase = await createClient();
    const {
      data: { user },
      error,
    } = await supabase.auth.getUser();

    if (error || !user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const role = await getServerRole();
    if (!role || !["admin", "manager", "super_admin"].includes(role)) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    const { searchParams } = new URL(request.url);
    const queryResult = querySchema.safeParse({
      hours: searchParams.get("hours") || "24",
    });

    if (!queryResult.success) {
      return NextResponse.json(
        { error: "Invalid hours parameter" },
        { status: 400 },
      );
    }

    const hours = queryResult.data.hours;

    const [signIns, privileges] = await Promise.all([
      fetchRecentSignIns(hours),
      fetchPrivilegeEvents(hours),
    ]);

    const chains = buildIdentityChain(signIns, privileges);
    const timeline = buildTimeline(chains);
    const mttr = calculateMTTR(timeline);
    const anomalies = detectAnomalies(chains);

    return NextResponse.json({
      timeline,
      mttr,
      anomalyCounts: {
        critical: anomalies.filter((a) => a.severity === "critical").length,
        high: anomalies.filter((a) => a.severity === "high").length,
        total: anomalies.length,
      },
      summary: {
        totalEvents: timeline.length,
        timeRange: hours,
        actorsInvolved: new Set(timeline.map((e) => e.actor)).size,
      },
    });
  } catch (error) {
    console.error("Timeline API error:", error);
    return NextResponse.json(
      { error: "Failed to build timeline" },
      { status: 500 },
    );
  }
}
