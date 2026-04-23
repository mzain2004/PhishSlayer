import { NextResponse } from "next/server";
import { auth } from "@clerk/nextjs/server";
import { createClient } from "@/lib/supabase/server";
import { AttackPathEngine } from "@/lib/soc/attack-path";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

export async function GET(req: Request) {
  const { userId } = await auth();
  if (!userId) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { searchParams } = new URL(req.url);
  const org_id = searchParams.get("org_id") || "default";

  try {
    const supabase = await createClient();
    const engine = new AttackPathEngine(supabase);
    const paths = await engine.getLatestPaths(org_id);

    return NextResponse.json(paths);
  } catch (error) {
    return NextResponse.json({ error: "Internal Server Error" }, { status: 500 });
  }
}
