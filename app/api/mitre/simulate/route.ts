import { NextRequest, NextResponse } from "next/server";
import { auth } from "@clerk/nextjs/server";
import { scoreAdversarySimulation } from "@/lib/mitre/simulation-scorer";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

export async function POST(request: NextRequest) {
  const { userId } = await auth();
  if (!userId) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const orgId = process.env.SYSTEM_ORG_ID || "system";

  try {
    const { adversary_id } = await request.json();
    if (!adversary_id) {
      return NextResponse.json({ error: "Missing adversary_id" }, { status: 400 });
    }

    const score = await scoreAdversarySimulation(orgId, adversary_id);
    return NextResponse.json(score);
  } catch (error: any) {
    console.error("[MITRE Simulate API] Error:", error);
    return NextResponse.json({ error: "INTERNAL_SERVER_ERROR" }, { status: 500 });
  }
}
