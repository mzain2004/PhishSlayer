import { NextResponse } from "next/server";
import { auth } from "@clerk/nextjs/server";
import { createClient } from "@/lib/supabase/server";
import { z } from "zod";

export const dynamic = 'force-dynamic';
export const runtime = 'nodejs';

const watchlistSchema = z.object({
  organization_id: z.string().uuid(),
  entity_type: z.enum(['ip', 'domain', 'email', 'user', 'hash']),
  entity_value: z.string().min(1),
  reason: z.string().optional(),
  expires_at: z.string().optional()
}).strict();

export async function GET(req: Request) {
  const { userId } = await auth();
  if (!userId) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { searchParams } = new URL(req.url);
  const orgId = searchParams.get("organization_id");
  if (!orgId) return NextResponse.json({ error: "organization_id is required" }, { status: 400 });

  const supabase = await createClient();
  const { data, error } = await supabase
    .from("watchlist")
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
    const validatedData = watchlistSchema.parse(body);

    const supabase = await createClient();
    const { data, error } = await supabase
      .from("watchlist")
      .upsert({
        ...validatedData,
        added_by: userId
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
