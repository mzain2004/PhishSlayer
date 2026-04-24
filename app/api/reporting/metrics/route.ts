import { NextResponse } from "next/server";
import { auth } from "@clerk/nextjs/server";
import { createClient } from "@/lib/supabase/server";
import { MetricsEngine } from "@/lib/reporting/metrics";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

export async function GET(req: Request) {
  const { userId } = await auth();
  if (!userId) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { searchParams } = new URL(req.url);
  const period_hours = parseInt(searchParams.get("period_hours") || "24");
  const org_id = searchParams.get("org_id") || "default"; // Simplified org resolution

  try {
    const supabase = await createClient();
    const engine = new MetricsEngine(supabase);
    const metrics = await engine.getDashboardMetrics(org_id, period_hours);

    return NextResponse.json(metrics);
  } catch (error) {
    return NextResponse.json({ error: "Internal Server Error" }, { status: 500 });
  }
}
