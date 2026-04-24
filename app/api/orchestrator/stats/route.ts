import { NextResponse } from "next/server";
import { auth } from "@clerk/nextjs/server";
import { createClient } from "@/lib/supabase/server";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

export async function GET() {
  const { userId } = await auth();
  if (!userId) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  try {
    const supabase = await createClient();
    const today = new Date();
    today.setHours(0, 0, 0, 0);

    const { data: runs, error } = await supabase
      .from("pipeline_runs")
      .select("final_decision, duration_ms")
      .gte("started_at", today.toISOString());

    if (error) throw error;

    const total = runs.length;
    const decisions: Record<string, number> = {};
    let totalDuration = 0;
    let autoCloseCount = 0;
    let escalationCount = 0;

    runs.forEach(r => {
        const action = r.final_decision?.action || "unknown";
        decisions[action] = (decisions[action] || 0) + 1;
        totalDuration += r.duration_ms || 0;
        if (action === "auto_close") autoCloseCount++;
        if (action === "escalate_l2" || action === "escalate_l3") escalationCount++;
    });

    return NextResponse.json({
      total_runs_today: total,
      decision_breakdown: decisions,
      avg_duration_ms: total > 0 ? totalDuration / total : 0,
      auto_close_rate: total > 0 ? (autoCloseCount / total) * 100 : 0,
      escalation_rate: total > 0 ? (escalationCount / total) * 100 : 0
    });
  } catch (error) {
    return NextResponse.json({ error: "Internal Server Error" }, { status: 500 });
  }
}
