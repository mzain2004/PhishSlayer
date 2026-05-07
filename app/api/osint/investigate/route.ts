import { NextResponse } from "next/server";
import { auth } from "@clerk/nextjs/server";
import { createClient } from "@/lib/supabase/server";
import { runInvestigation } from "@/lib/osint/orchestrator";
import { OsintTargetType } from "@/lib/osint/types";
import { z } from "zod";

const schema = z.object({ targetType: z.string(), targetValue: z.string(), organizationId: z.string() });

export const dynamic = 'force-dynamic';
export const runtime = 'nodejs';

export async function POST(req: Request) {
  const { userId } = await auth();
  if (!userId) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  try {
    const body = await req.json();
    const parsed = schema.safeParse(body);
    if (!parsed.success) return NextResponse.json({ error: parsed.error.issues }, { status: 400 });
    const { targetType, targetValue, organizationId } = parsed.data;
    
    if (!['domain','ip','email','hash','person','company'].includes(targetType)) {
      return NextResponse.json({ error: "Invalid target type" }, { status: 400 });
    }

    const supabase = await createClient();
    
    const { data: inv, error } = await supabase.from("osint_investigations").insert({
      organization_id: organizationId,
      target_type: targetType as OsintTargetType,
      target_value: targetValue,
      status: 'running',
      created_by: userId
    }).select().single();

    if (error) return NextResponse.json({ error: "INTERNAL_SERVER_ERROR" }, { status: 500 });

    // Run background task
    void runInvestigation(supabase, { type: targetType as OsintTargetType, value: targetValue, orgId: organizationId }, inv.id);

    return NextResponse.json({ investigationId: inv.id }, { status: 202 });
  } catch (error) {
    return NextResponse.json({ error: "Internal Server Error" }, { status: 500 });
  }
}
