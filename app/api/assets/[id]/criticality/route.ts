import { NextResponse } from "next/server";
import { auth } from "@clerk/nextjs/server";
import { createClient } from "@/lib/supabase/server";
import { z } from "zod";

export const dynamic = 'force-dynamic';
export const runtime = 'nodejs';

const schema = z.object({
  criticality: z.enum(['low', 'medium', 'high', 'critical']),
  tags: z.array(z.string()).optional()
});

export async function PUT(req: Request, { params }: { params: Promise<{ id: string }> }) {
  const { userId } = await auth();
  if (!userId) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { id } = await params;

  try {
    const body = await req.json();
    const { criticality, tags } = schema.parse(body);

    const supabase = await createClient();
    const { data, error } = await supabase
      .from("asset_inventory")
      .update({
        criticality,
        asset_tags: tags
      })
      .eq("id", id)
      .select()
      .single();

    if (error) return NextResponse.json({ error: "INTERNAL_SERVER_ERROR" }, { status: 500 });
    return NextResponse.json(data);
  } catch (error) {
    if (error instanceof z.ZodError) return NextResponse.json({ error: error.issues }, { status: 400 });
    return NextResponse.json({ error: "Internal Server Error" }, { status: 500 });
  }
}
