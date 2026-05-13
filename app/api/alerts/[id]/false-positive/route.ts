import { NextResponse } from "next/server";
import { auth } from "@clerk/nextjs/server";
import { createClient } from "@/lib/supabase/server";
import { markFalsePositive } from "@/lib/l1/falsePositiveEngine";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

export async function POST(
  req: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  const { userId, orgId } = await auth();
  if (!userId || !orgId)
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { id } = await params;

  try {
    const supabase = await createClient();

    // Get orgId for the alert
    const { data: alert, error: fetchError } = await supabase
      .from("alerts")
      .select("org_id")
      .eq("id", id)
      .eq("org_id", orgId)
      .single();

    if (fetchError || !alert)
      return NextResponse.json({ error: "Alert not found" }, { status: 404 });

    await markFalsePositive(supabase, id, alert.org_id, userId);

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("[api] Error marking FP:", error);
    return NextResponse.json(
      { error: "Internal Server Error" },
      { status: 500 },
    );
  }
}
