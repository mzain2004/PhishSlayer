import { NextResponse } from "next/server";
import { auth } from "@clerk/nextjs/server";
import { z } from "zod";
import { createClient } from "@/lib/supabase/server";
import { HuntEngine } from "@/lib/soc/hunting/engine";
import { HYPOTHESES } from "@/lib/soc/hunting/hypotheses";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

const validHypothesisIds = Object.keys(HYPOTHESES) as [string, ...string[]];
const schema = z.object({
  hypothesis_id: z.enum(validHypothesisIds),
  org_id: z.string().optional().default("default")
});

export async function POST(req: Request) {
  const { userId } = await auth();
  if (!userId) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    const body = await req.json();
    const { hypothesis_id, org_id } = schema.parse(body);

    const supabase = await createClient();
    const engine = new HuntEngine(supabase);
    const mission = await engine.runHunt(hypothesis_id, org_id);

    return NextResponse.json(mission);
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json({ error: "Validation failed", details: error.issues }, { status: 400 });
    }
    return NextResponse.json({ error: "Internal Server Error" }, { status: 500 });
  }
}
