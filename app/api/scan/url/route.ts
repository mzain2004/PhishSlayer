import { NextResponse } from "next/server";
import { z } from "zod";
import { createClient } from "@/lib/supabase/server";
import { checkTierAccess } from "@/lib/tier-guard";
import { scanTarget } from "@/lib/scanners/threatScanner";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

const ScanSchema = z.object({
  target: z.string().min(1),
});

export async function POST(request: Request) {
  try {
    const supabase = await createClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();

    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const access = await checkTierAccess(user.id, "url_scan");
    if (!access.allowed) {
      return NextResponse.json(
        {
          error: "Monthly scan limit reached",
          required_tier: "pro",
          current_tier: access.tier,
          limit: access.limit,
        },
        { status: 403 },
      );
    }

    const payload = ScanSchema.safeParse(await request.json());
    if (!payload.success) {
      return NextResponse.json(
        { error: "Invalid payload", details: payload.error.flatten() },
        { status: 400 },
      );
    }

    const finding = await scanTarget(payload.data.target);

    return NextResponse.json({ success: true, data: finding });
  } catch (error) {
    return NextResponse.json(
      {
        error: error instanceof Error ? error.message : "Failed to run scan",
      },
      { status: 500 },
    );
  }
}
