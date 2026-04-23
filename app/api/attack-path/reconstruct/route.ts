import { NextResponse } from "next/server";
import { auth } from "@clerk/nextjs/server";
import { z } from "zod";
import { createClient } from "@/lib/supabase/server";
import { AttackPathEngine } from "@/lib/soc/attack-path";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

const schema = z.object({
  alert_id: z.string().uuid(),
  org_id: z.string().optional().default("default")
});

export async function POST(req: Request) {
  const { userId } = await auth();
  if (!userId) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    const body = await req.json();
    const { alert_id, org_id } = schema.parse(body);

    const supabase = await createClient();
    const engine = new AttackPathEngine(supabase);
    const path = await engine.reconstructPath(alert_id, org_id);

    if (!path) {
      return NextResponse.json({ error: "No related events found to reconstruct path" }, { status: 404 });
    }

    return NextResponse.json(path);
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json({ error: "Validation failed", details: error.issues }, { status: 400 });
    }
    return NextResponse.json({ error: "Internal Server Error" }, { status: 500 });
  }
}
