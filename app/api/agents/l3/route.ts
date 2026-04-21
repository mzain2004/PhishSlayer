import { NextResponse } from "next/server";
import { auth } from "@clerk/nextjs/server";
import { checkTierAccess } from "@/lib/tier-guard";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

export async function GET() {
  try {
    const { userId } = await auth();
    if (!userId) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const access = await checkTierAccess(userId, "agent_l3");
    if (!access.allowed) {
      return NextResponse.json(
        {
          error: "Upgrade required",
          required_tier: "enterprise",
          current_tier: access.tier,
        },
        { status: 403 },
      );
    }

    return NextResponse.json({ success: true, enabled: true, level: "l3" });
  } catch (error) {
    return NextResponse.json(
      {
        error:
          error instanceof Error
            ? error.message
            : "Failed to validate L3 agent access",
      },
      { status: 500 },
    );
  }
}
