import { NextResponse } from "next/server";
import { auth } from "@clerk/nextjs/server";
import { createClient } from "@/lib/supabase/server";
import { z } from "zod";

const schema = z.object({ actionId: z.string() });

export const dynamic = 'force-dynamic';
export const runtime = 'nodejs';

export async function GET(req: Request) {
  const { userId } = await auth();
  if (!userId) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { searchParams } = new URL(req.url);
  const orgId = searchParams.get("organizationId");
  if (!orgId) return NextResponse.json({ error: "organizationId required" }, { status: 400 });

  const supabase = await createClient();
  const { data, error } = await supabase
    .from("containment_actions")
    .select("*")
    .eq("organization_id", orgId)
    .order("executed_at", { ascending: false })
    .limit(50);

  if (error) return NextResponse.json({ error: "INTERNAL_SERVER_ERROR" }, { status: 500 });
  return NextResponse.json(data);
}

export async function POST(req: Request) {
  const { userId } = await auth();
  if (!userId) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  try {
    const body = await req.json();
    const parsed = schema.safeParse(body);
    if (!parsed.success) return NextResponse.json({ error: parsed.error.issues }, { status: 400 });
    const { actionId } = parsed.data;
    const supabase = await createClient();

    const { data: action } = await supabase.from("containment_actions").select("*").eq("id", actionId).single();
    if (!action) return NextResponse.json({ error: "Action not found" }, { status: 404 });

    // Reverse logic placeholder
    await supabase.from("containment_actions").update({
      reversed_at: new Date().toISOString(),
      reversed_by: userId,
      status: 'success'
    }).eq("id", actionId);

    return NextResponse.json({ success: true });
  } catch (error) {
    return NextResponse.json({ error: "Internal Server Error" }, { status: 500 });
  }
}
