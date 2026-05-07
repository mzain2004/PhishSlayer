import { NextResponse } from "next/server";
import { auth } from "@clerk/nextjs/server";
import { createClient } from "@/lib/supabase/server";
import { z } from "zod";

export const dynamic = 'force-dynamic';
export const runtime = 'nodejs';

const ruleSchema = z.object({
  name: z.string().min(1),
  organization_id: z.string().uuid(),
  rule_type: z.enum(['ip', 'domain', 'time_window', 'severity', 'rule_name']),
  match_value: z.string().optional(),
  time_start: z.string().optional(),
  time_end: z.string().optional(),
  expires_at: z.string().optional(),
  is_active: z.boolean().default(true)
});

export async function GET(req: Request) {
  const { userId } = await auth();
  if (!userId) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { searchParams } = new URL(req.url);
  const orgId = searchParams.get("organization_id");
  if (!orgId) return NextResponse.json({ error: "organization_id is required" }, { status: 400 });

  const supabase = await createClient();
  const { data, error } = await supabase
    .from("suppression_rules")
    .select("*")
    .eq("organization_id", orgId)
    .order("created_at", { ascending: false });

  if (error) return NextResponse.json({ error: "INTERNAL_SERVER_ERROR" }, { status: 500 });
  return NextResponse.json(data);
}

export async function POST(req: Request) {
  const { userId } = await auth();
  if (!userId) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  try {
    const body = await req.json();
    const validatedData = ruleSchema.parse(body);

    const supabase = await createClient();
    const { data, error } = await supabase
      .from("suppression_rules")
      .insert({
        ...validatedData,
        created_by: userId
      })
      .select()
      .single();

    if (error) return NextResponse.json({ error: "INTERNAL_SERVER_ERROR" }, { status: 500 });
    return NextResponse.json(data);
  } catch (error) {
    if (error instanceof z.ZodError) return NextResponse.json({ error: error.issues }, { status: 400 });
    return NextResponse.json({ error: "Internal Server Error" }, { status: 500 });
  }
}
