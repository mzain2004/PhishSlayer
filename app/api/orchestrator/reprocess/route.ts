import { NextResponse } from "next/server";
import { auth } from "@clerk/nextjs/server";
import { z } from "zod";
import { createClient } from "@/lib/supabase/server";
import { AutonomousOrchestrator } from "@/lib/soc/orchestrator";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

const schema = z.object({
  alert_id: z.string().uuid(),
  org_id: z.string().optional().default("default")
});

export async function POST(req: Request) {
  const { userId } = await auth();
  if (!userId) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  try {
    const body = await req.json();
    const { alert_id, org_id } = schema.parse(body);

    const supabase = await createClient();
    const orchestrator = new AutonomousOrchestrator(supabase);
    const run = await orchestrator.processAlert(alert_id, org_id);

    return NextResponse.json(run);
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json({ error: "Validation failed", details: error.issues }, { status: 400 });
    }
    return NextResponse.json({ error: "Internal Server Error" }, { status: 500 });
  }
}
