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
    ioc: z.string().min(1).max(500).optional(),
    hypothesis_id: z.enum(validHypothesisIds).optional(),
  })
  .refine(d => d.ioc || d.hypothesis_id, {
    message: "Either ioc or hypothesis_id required",
  });

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
    const { hypothesis_id, ioc } = parsed.data;

    const supabase = await createClient();
    const engine = new HuntEngine(supabase);
    let resolvedHypothesis = hypothesis_id;
    if (!resolvedHypothesis && ioc) {
      const ipRegex = /^(\d{1,3}\.){3}\d{1,3}$/;
      const hashRegex = /^[a-fA-F0-9]{32,64}$/;
      const urlRegex = /^https?:\/\//;
      if (ipRegex.test(ioc)) resolvedHypothesis = "c2_beacon_detection";
      else if (hashRegex.test(ioc)) resolvedHypothesis = "malware_execution";
      else if (urlRegex.test(ioc)) resolvedHypothesis = "dns_tunneling";
      else resolvedHypothesis = "lateral_movement";
      const available = Object.keys(HYPOTHESES);
      if (!available.includes(resolvedHypothesis)) resolvedHypothesis = available[0];
    }
    const mission = await engine.runHunt(resolvedHypothesis!, orgId);

    return NextResponse.json(mission);
  } catch (err) {
    console.error("[hunting/run]", err);
    return NextResponse.json(
      { error: "Internal Server Error" },
      { status: 500 },
    );
  }
}
