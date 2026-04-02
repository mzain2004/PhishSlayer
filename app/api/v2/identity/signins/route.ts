import { NextResponse } from "next/server";
import { z } from "zod";
import { createClient } from "@/lib/supabase/server";
import { fetchRecentSignIns } from "@/lib/microsoft/signInIngestion";

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

    const signIns = await fetchRecentSignIns(queryResult.data.hours);
    return NextResponse.json({ signIns, count: signIns.length });
  } catch (error) {
    console.error("Sign-ins API error:", error);
    return NextResponse.json(
      { error: "Failed to fetch sign-ins" },
      { status: 500 },
    );
  }
}
