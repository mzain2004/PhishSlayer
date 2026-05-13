import { NextResponse } from "next/server";
import { auth } from "@clerk/nextjs/server";
import { z } from "zod";
import { createClient } from "@/lib/supabase/server";
import { HuntEngine } from "@/lib/soc/hunting/engine";
import { HYPOTHESES } from "@/lib/soc/hunting/hypotheses";
import { rateLimit, rateLimitResponse } from "@/lib/security/rate-limit";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

const validHypothesisIds = Object.keys(HYPOTHESES) as [string, ...string[]];
// .strict() so we reject organization_id (or any other unexpected field)
// from the request body. The org MUST come from the Clerk JWT, never from
// user-supplied input.
const schema = z
  .object({
    hypothesis_id: z.enum(validHypothesisIds),
  })
  .strict();

export async function POST(req: Request) {
  const { userId, orgId } = await auth();
  if (!userId || !orgId) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const limit = await rateLimit(`hunting:run:${orgId}`, 10, 60);
  if (!limit.allowed) return rateLimitResponse(limit.retryAfterSeconds);

  try {
    const body = await req.json();
    const parsed = schema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json({ error: "Invalid input" }, { status: 400 });
    }
    const { hypothesis_id } = parsed.data;

    const supabase = await createClient();
    const engine = new HuntEngine(supabase);
    const mission = await engine.runHunt(hypothesis_id, orgId);

    return NextResponse.json(mission);
  } catch (err) {
    console.error("[hunting/run]", err);
    return NextResponse.json(
      { error: "Internal Server Error" },
      { status: 500 },
    );
  }
}
