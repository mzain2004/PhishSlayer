import { NextRequest, NextResponse } from "next/server";
import { auth } from "@clerk/nextjs/server";
import { getCoverageGaps } from "@/lib/mitre/coverage-engine";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

export async function GET(request: NextRequest) {
  const { userId } = await auth();
  if (!userId) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const orgId = process.env.SYSTEM_ORG_ID || "system";

  try {
    const gaps = await getCoverageGaps(orgId);
    return NextResponse.json(gaps);
  } catch (error) {
    console.error("[MITRE Gaps API] Error:", error);
    return NextResponse.json({ error: "Internal Server Error" }, { status: 500 });
  }
}
