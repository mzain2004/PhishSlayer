import { NextResponse } from "next/server";
import { auth } from "@clerk/nextjs/server";
import { z } from "zod";
import { createClerkSupabaseClient } from "@/lib/supabase/clerk-client";
import { notifyExternalSystems } from "@/lib/connectors/index";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

const createCaseSchema = z.object({
  title: z.string().min(1, "Title is required"),
  org_id: z.string().optional(),
  severity: z.enum(["p1", "p2", "p3", "p4"]).optional().default("p3"),
  status: z.enum(["open", "investigating", "contained", "closed"]).optional().default("open"),
  alert_type: z.string().optional(),
  source_ip: z.string().optional(),
  affected_asset: z.string().optional(),
  mitre_tactic: z.string().optional(),
  mitre_technique: z.string().optional(),
  sla_deadline: z.string().optional(),
});

export async function GET() {
  const { userId } = await auth();
  if (!userId) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const supabase = await createClerkSupabaseClient();
  const { data, error } = await supabase
    .from("cases")
    .select("*")
    .order("created_at", { ascending: false });

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  return NextResponse.json(data);
}

export async function POST(req: Request) {
  const { userId } = await auth();
  if (!userId) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    const body = await req.json();
    const validatedData = createCaseSchema.parse(body);
    
    const supabase = await createClerkSupabaseClient();
    const { data, error } = await supabase
      .from("cases")
      .insert({
        ...validatedData,
        user_id: userId,
      })
      .select()
      .single();

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    // Notify External Systems
    void notifyExternalSystems(
        data.id, 
        data.title, 
        data.severity, 
        `Auto-created case for ${data.alert_type} on asset ${data.affected_asset || 'unknown'}`, 
        supabase
    );

    return NextResponse.json(data, { status: 201 });
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json({ error: "Validation failed", details: error.issues }, { status: 400 });
    }
    return NextResponse.json({ error: "Internal Server Error" }, { status: 500 });
  }
}
