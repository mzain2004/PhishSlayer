import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";
import { calculateCoverage } from "@/lib/mitre/coverage-engine";
import { verifyCronAuth, unauthorizedResponse } from "@/lib/security/cronAuth";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

function getAdminClient() {
  return createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!,
    { auth: { autoRefreshToken: false, persistSession: false } }
  );
}

export async function GET(request: NextRequest) {
  if (!verifyCronAuth(request)) {
    return unauthorizedResponse();
  }

  const supabase = getAdminClient();

  try {
    // 1. Get all organizations
    const { data: orgs } = await supabase.from('organizations').select('id');
    if (!orgs) return NextResponse.json({ success: true, processed: 0 });

    let processed = 0;

    // 2. Calculate and cache coverage score per org
    for (const org of orgs) {
      const report = await calculateCoverage(org.id);
      
      await supabase.from('organizations')
        .update({ mitre_coverage_score: report })
        .eq('id', org.id);
        
      processed++;
    }

    return NextResponse.json({ success: true, processed });
  } catch (error: any) {
    console.error("[CRON MITRE Coverage] Error:", error);
    return NextResponse.json({ error: "INTERNAL_SERVER_ERROR" }, { status: 500 });
  }
}
