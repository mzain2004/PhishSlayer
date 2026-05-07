import { NextRequest, NextResponse } from "next/server";
import { auth } from "@clerk/nextjs/server";
import { createClient } from "@/lib/supabase/server";
import { techniques } from "@/lib/mitre/attack-data";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

export async function GET(request: NextRequest) {
  const { userId } = await auth();
  if (!userId) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  // Retrieve org ID
  const supabase = await createClient();
  const orgId = process.env.SYSTEM_ORG_ID || "system";

  try {
    const { data: coverage } = await supabase
      .from("mitre_coverage")
      .select("technique_id, tactic_id, coverage_level, detection_count")
      .eq("org_id", orgId);

    const coverageMap = new Map(coverage?.map(c => [c.technique_id, c]) || []);

    const heatmap = techniques.map(tech => {
      const cov = coverageMap.get(tech.id);
      return {
        tactic_id: tech.tactic_id,
        tactic_name: "Tactic Name Mapping Omitted for brevity", // Need the tactic data if requested
        technique_id: tech.id,
        technique_name: tech.name,
        coverage_level: cov ? cov.coverage_level : 0,
        detection_count: cov ? cov.detection_count : 0
      };
    });

    return NextResponse.json(heatmap);
  } catch (error) {
    console.error("[MITRE Heatmap API] Error:", error);
    return NextResponse.json({ error: "Internal Server Error" }, { status: 500 });
  }
}
