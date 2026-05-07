import { NextRequest, NextResponse } from "next/server";
import { auth } from "@clerk/nextjs/server";
import { createClient } from "@/lib/supabase/server";
import { calculateCoverage } from "@/lib/mitre/coverage-engine";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

export async function GET(request: NextRequest) {
  const { userId } = await auth();
  if (!userId) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  // Retrieve org ID
  const supabase = await createClient();
  const orgId = process.env.SYSTEM_ORG_ID || "system"; // Simplified for implementation

  try {
    const report = await calculateCoverage(orgId);
    return NextResponse.json(report);
  } catch (error) {
    console.error("[MITRE Coverage API] Error:", error);
    return NextResponse.json({ error: "Internal Server Error" }, { status: 500 });
  }
}
