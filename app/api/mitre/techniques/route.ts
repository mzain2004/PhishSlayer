import { NextRequest, NextResponse } from "next/server";
import { auth } from "@clerk/nextjs/server";
import { techniques } from "@/lib/mitre/attack-data";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

export async function GET(request: NextRequest) {
  const { userId } = await auth();
  if (!userId) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const tactic = request.nextUrl.searchParams.get("tactic");
  
  if (tactic) {
    const filtered = techniques.filter(t => t.tactic_id === tactic);
    return NextResponse.json(filtered);
  }

  return NextResponse.json(techniques);
}
