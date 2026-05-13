import { NextResponse } from "next/server";
import { auth } from "@clerk/nextjs/server";
import { z } from "zod";
import { createClient } from "@/lib/supabase/server";
import { AutoCloseEngine } from "@/lib/soc/autoclose";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

const feedbackSchema = z.object({
  analyst_decision: z.enum(["true_positive", "false_positive", "benign"]),
  notes: z.string().optional(),
  case_id: z.string().min(1),
  alert_type: z.string().optional(),
  source_ip: z.string().optional(),
  rule_id: z.string().optional(),
  original_action: z.string().optional().default("escalated"),
}).strict();

export async function POST(
  req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const { userId, orgId } = await auth();
  if (!userId || !orgId) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { id } = await params;

  try {
    const body = await req.json();
    const validatedData = feedbackSchema.parse({ ...body, case_id: id });
    
    const supabase = await createClient();
    const engine = new AutoCloseEngine(supabase, orgId);

    await engine.recordFeedback({
      ...validatedData,
      analyst_id: userId,
      created_at: new Date(),
      notes: validatedData.notes || null,
      alert_type: validatedData.alert_type || "unknown",
      source_ip: validatedData.source_ip || "unknown",
      rule_id: validatedData.rule_id || "unknown",
    });

    return NextResponse.json({ success: true });
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json({ error: "Validation failed", details: error.issues }, { status: 400 });
    }
    return NextResponse.json({ error: "Internal Server Error" }, { status: 500 });
  }
}
