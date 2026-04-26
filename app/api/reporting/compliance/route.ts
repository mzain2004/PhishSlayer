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
  const framework = searchParams.get("framework");
  const organization_id = searchParams.get("organization_id") || "default";

  try {
    const supabase = await createClient();
    const engine = new MetricsEngine(supabase);

    if (framework) {
        const result = await engine.getComplianceMapping(organization_id, framework);
        return NextResponse.json(result);
    }

    const results = await Promise.all([
        engine.getComplianceMapping(organization_id, "nist_csf"),
        engine.getComplianceMapping(organization_id, "iso_27001"),
        engine.getComplianceMapping(organization_id, "soc2")
    ]);

    return NextResponse.json(results);
  } catch (error) {
    return NextResponse.json({ error: "Internal Server Error" }, { status: 500 });
  }
}
