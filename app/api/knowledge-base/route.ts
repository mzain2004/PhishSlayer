import { NextResponse } from "next/server";
import { auth } from "@clerk/nextjs/server";
import { createClient } from "@/lib/supabase/server";
import { z } from "zod";

const schema = z.object({ 
  title: z.string(), 
  content: z.string().optional(), 
  category: z.string().optional(), 
  tags: z.array(z.string()).optional(), 
  organization_id: z.string().optional() 
}).passthrough();

export const dynamic = 'force-dynamic';
export const runtime = 'nodejs';

export async function GET(req: Request) {
  const { userId, orgId } = await auth();
  if (!userId) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { searchParams } = new URL(req.url);
  const organizationId = searchParams.get("organizationId") || orgId;

  const supabase = await createClient();
  const { data, error } = await supabase
    .from("knowledge_base")
    .select("*")
    .or(`organization_id.eq.${organizationId},organization_id.is.null`)
    .order("created_at", { ascending: false });

  if (error) return NextResponse.json({ error: "INTERNAL_SERVER_ERROR" }, { status: 500 });
  return NextResponse.json(data);
}

export async function POST(req: Request) {
  const { userId, orgId } = await auth();
  if (!userId) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  try {
    const rawBody = await req.json();
    const parsed = schema.safeParse(rawBody);
    if (!parsed.success) return NextResponse.json({ error: parsed.error.issues }, { status: 400 });
    const body = parsed.data;
    const supabase = await createClient();
    const { data, error } = await supabase
      .from("knowledge_base")
      .insert({ ...body, created_by: userId })
      .select()
      .single();

    if (error) return NextResponse.json({ error: "INTERNAL_SERVER_ERROR" }, { status: 500 });
    return NextResponse.json(data);
  } catch (error) {
    return NextResponse.json({ error: "Internal Server Error" }, { status: 500 });
  }
}
