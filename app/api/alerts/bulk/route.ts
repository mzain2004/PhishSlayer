import { NextResponse } from "next/server";
import { auth } from "@clerk/nextjs/server";
import { createClient } from "@/lib/supabase/server";
import { z } from "zod";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

const bulkSchema = z.object({
  alertIds: z.array(z.string().uuid()),
  action: z.enum(["close", "assign", "escalate", "suppress", "mark_fp"]),
  payload: z.any().optional(),
}).strict();

export async function POST(req: Request) {
  const { userId } = await auth();
  if (!userId)
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  try {
    const body = await req.json();
    const { alertIds, action, payload } = bulkSchema.parse(body);

    const supabase = await createClient();

    // 1. Security Check: Ensure all alerts belong to user's org
    const { data: membership } = await supabase
      .from("organization_members")
      .select("organization_id")
      .eq("user_id", userId)
      .limit(1)
      .maybeSingle();

    if (!membership)
      return NextResponse.json(
        { error: "No organization membership" },
        { status: 403 },
      );
    const orgId = membership.organization_id;

    // Verify ownership
    const { data: verifiedAlerts, error: verifyError } = await supabase
      .from("alerts")
      .select("id")
      .eq("org_id", orgId)
      .in("id", alertIds);

    if (
      verifyError ||
      !verifiedAlerts ||
      verifiedAlerts.length !== alertIds.length
    ) {
      return NextResponse.json(
        { error: "Unauthorized access to some alerts" },
        { status: 403 },
      );
    }

    let updateData: any = {};
    switch (action) {
      case "close":
        updateData = { status: "closed" };
        break;
      case "assign":
        updateData = { assigned_to: payload.analystId };
        break;
      case "escalate":
        updateData = { status: "escalated" };
        break;
      case "suppress":
        updateData = { is_suppressed: true };
        break;
      case "mark_fp":
        updateData = { is_false_positive: true, status: "closed" };
        break;
    }

    const { error: updateError } = await supabase
      .from("alerts")
      .update(updateData)
      .eq("org_id", orgId)
      .in("id", alertIds);

    if (updateError)
      return NextResponse.json({ error: updateError.message }, { status: 500 });

    return NextResponse.json({ success: alertIds.length, failed: 0 });
  } catch (error) {
    if (error instanceof z.ZodError)
      return NextResponse.json({ error: error.issues }, { status: 400 });
    return NextResponse.json(
      { error: "Internal Server Error" },
      { status: 500 },
    );
  }
}
