import { NextResponse } from "next/server";
import { z } from "zod";
import { createClient } from "@/lib/supabase/server";
import { fetchRecentSignIns } from "@/lib/microsoft/signInIngestion";
import { fetchPrivilegeEvents } from "@/lib/microsoft/privilegeTracking";
import { buildIdentityChain } from "@/lib/microsoft/chainBuilder";
import { detectAnomalies } from "@/lib/microsoft/anomalyDetector";

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
    const anomalies = detectAnomalies(chains);

    return NextResponse.json({
      anomalies,
      counts: {
        critical: anomalies.filter((a) => a.severity === "critical").length,
        high: anomalies.filter((a) => a.severity === "high").length,
        medium: anomalies.filter((a) => a.severity === "medium").length,
        total: anomalies.length,
      },
    });
  } catch (error) {
    console.error("Anomalies API error:", error);
    return NextResponse.json(
      { error: "Failed to detect anomalies" },
      { status: 500 },
    );
  }
}
