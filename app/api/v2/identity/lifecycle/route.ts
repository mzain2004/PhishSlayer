import { NextResponse } from "next/server";
import { z } from "zod";
import { createClient } from "@/lib/supabase/server";
import { fetchNonHumanLifecycle } from "@/lib/microsoft/nonHumanLifecycle";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

const querySchema = z.object({
  hours: z.coerce.number().int().min(1).max(720).default(72),
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
      hours: searchParams.get("hours") || "72",
    });

    if (!queryResult.success) {
      return NextResponse.json(
        { error: "Invalid hours parameter" },
        { status: 400 },
      );
    }

    const summaries = await fetchNonHumanLifecycle(queryResult.data.hours);

    return NextResponse.json({
      summaries,
      counts: {
        critical: summaries.filter((s) => s.overallRisk === "critical").length,
        high: summaries.filter((s) => s.overallRisk === "high").length,
        total: summaries.length,
      },
    });
  } catch (error) {
    console.error("Lifecycle API error:", error);
    return NextResponse.json(
      { error: "Failed to fetch lifecycle data" },
      { status: 500 },
    );
  }
}
