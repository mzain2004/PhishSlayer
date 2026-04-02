import { NextResponse } from "next/server";
import { z } from "zod";
import { createClient } from "@/lib/supabase/server";
import {
  fetchRecentSignIns,
  fetchNonHumanIdentities,
} from "@/lib/microsoft/signInIngestion";
import { fetchPrivilegeEvents } from "@/lib/microsoft/privilegeTracking";
import { buildIdentityChain } from "@/lib/microsoft/chainBuilder";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

const querySchema = z.object({
  hours: z.coerce.number().int().min(1).max(168).default(24),
});

export async function GET(request: Request) {
  try {
    const supabase = await createClient();
    const {
      data: { user },
      error,
    } = await supabase.auth.getUser();

    if (error || !user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { searchParams } = new URL(request.url);
    const queryResult = querySchema.safeParse({
      hours: searchParams.get("hours") || "24",
    });

    if (!queryResult.success) {
      return NextResponse.json(
        { error: "Invalid hours parameter" },
        { status: 400 },
      );
    }

    const hours = queryResult.data.hours;

    // Fetch all data in parallel
    const [signIns, privileges, nonHumanActors] = await Promise.all([
      fetchRecentSignIns(hours),
      fetchPrivilegeEvents(hours),
      fetchNonHumanIdentities(),
    ]);

    const chains = buildIdentityChain(signIns, privileges);

    return NextResponse.json({
      chains,
      nonHumanActors,
      summary: {
        totalChains: chains.length,
        highRisk: chains.filter((c) => c.verdict.startsWith("HIGH")).length,
        partialGraphs: chains.filter((c) => c.isPartialGraph).length,
        avgConfidence:
          chains.length > 0
            ? Math.round(
                chains.reduce((sum, c) => sum + c.overallConfidence, 0) /
                  chains.length,
              )
            : 0,
      },
    });
  } catch (error) {
    console.error("Chain API error:", error);
    return NextResponse.json(
      { error: "Failed to build identity chain" },
      { status: 500 },
    );
  }
}
