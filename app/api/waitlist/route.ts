import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { auth } from '@clerk/nextjs/server';
import { z } from "zod";
import { checkRateLimit, getClientIp } from "@/lib/security/rateLimit";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

const WaitlistSchema = z.object({
  email: z.string().email(),
  tier: z.string().trim().min(1).max(80).optional(),
});

export async function POST(request: Request) {
  try {
    const { userId } = await auth();
  if (!userId) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const supabase = await createClient();

    const clientIp = getClientIp(request);
    const rate = checkRateLimit(`waitlist:${userId}:${clientIp}`, {
      windowMs: 60_000,
      max: 3,
    });

    if (!rate.allowed) {
      return NextResponse.json(
        { error: "Rate limit exceeded" },
        { status: 429 },
      );
    }

    let payload: unknown;
    try {
      payload = await request.json();
    } catch {
      return NextResponse.json({ error: "Invalid JSON body" }, { status: 400 });
    }

    const parsed = WaitlistSchema.safeParse(payload);
    if (!parsed.success) {
      return NextResponse.json(
        { error: "Invalid waitlist payload" },
        { status: 400 },
      );
    }

    const email = parsed.data.email.trim().toLowerCase();
    const tier = parsed.data.tier || "adaptive_defense";

    const { error } = await supabase
      .from("waitlist")
      .upsert({ email }, { onConflict: "email" })
      .select();

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    return NextResponse.json({ success: true });
  } catch (error) {
    return NextResponse.json({ error: String(error) }, { status: 500 });
  }
}
