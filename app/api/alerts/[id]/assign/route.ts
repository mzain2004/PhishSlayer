import { NextResponse } from "next/server";
import { auth } from "@clerk/nextjs/server";
import { createClient } from "@/lib/supabase/server";
import { z } from "zod";

const schema = z.object({ analystId: z.string() }).strict();

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
    const body = await req.json();
    const parsed = schema.safeParse(body);
    if (!parsed.success)
      return NextResponse.json({ error: parsed.error.issues }, { status: 400 });
    const { analystId } = parsed.data;

    const supabase = await createClient();
    const { data, error } = await supabase
      .from("alerts")
      .update({
        assigned_to: analystId,
      })
      .eq("id", id)
      .eq("org_id", orgId)
      .select()
      .single();

    if (error)
      return NextResponse.json(
        { error: "INTERNAL_SERVER_ERROR" },
        { status: 500 },
      );
    return NextResponse.json(data);
  } catch (error) {
    return NextResponse.json(
      { error: "Internal Server Error" },
      { status: 500 },
    );
  }
}
