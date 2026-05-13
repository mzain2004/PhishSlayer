import { NextResponse } from "next/server";
import { auth } from "@clerk/nextjs/server";
import { createClient } from "@/lib/supabase/server";
import { z } from "zod";
import { requireRole } from "@/lib/security/rbac";

// Intentionally passthrough: knowledge-base payloads may include future metadata fields.
const schema = z
  .object({
    title: z.string().optional(),
    content: z.string().optional(),
    category: z.string().optional(),
    tags: z.array(z.string()).optional(),
    organization_id: z.string().optional(),
  })
  .passthrough();

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

export async function GET(
  req: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  const { userId } = await auth();
  if (!userId)
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { id } = await params;
  const supabase = await createClient();
  const { data, error } = await supabase
    .from("knowledge_base")
    .select("*")
    .eq("id", id)
    .single();

  if (error)
    return NextResponse.json(
      { error: "INTERNAL_SERVER_ERROR" },
      { status: 500 },
    );
  return NextResponse.json(data);
}

export async function PUT(
  req: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  const { userId } = await auth();
  if (!userId)
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { id } = await params;
  try {
    const rawBody = await req.json();
    const parsed = schema.safeParse(rawBody);
    if (!parsed.success)
      return NextResponse.json({ error: parsed.error.issues }, { status: 400 });
    const body = parsed.data;
    const supabase = await createClient();
    const { data, error } = await supabase
      .from("knowledge_base")
      .update({ ...body, updated_at: new Date().toISOString() })
      .eq("id", id)
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

export async function DELETE(
  req: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  const guard = await requireRole(["org:owner", "org:admin"]);
  if (!guard.ok) return guard.response;

  const { id } = await params;
  const supabase = await createClient();
  const { error } = await supabase.from("knowledge_base").delete().eq("id", id);

  if (error)
    return NextResponse.json(
      { error: "INTERNAL_SERVER_ERROR" },
      { status: 500 },
    );
  return NextResponse.json({ success: true });
}
