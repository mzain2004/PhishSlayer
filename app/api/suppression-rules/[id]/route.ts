import { NextResponse } from "next/server";
import { auth } from "@clerk/nextjs/server";
import { createClient } from "@/lib/supabase/server";
import { z } from "zod";
import { requireRole } from "@/lib/security/rbac";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

const updateSchema = z
  .object({
    name: z.string().optional(),
    is_active: z.boolean().optional(),
    match_value: z.string().optional(),
    time_start: z.string().optional(),
    time_end: z.string().optional(),
    expires_at: z.string().optional(),
  })
  .strict();

export async function PUT(
  req: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  const guard = await requireRole(["org:owner", "org:admin"]);
  if (!guard.ok) return guard.response;

  const { id } = await params;

  try {
    const body = await req.json();
    const validatedData = updateSchema.parse(body);

    const supabase = await createClient();
    const { data, error } = await supabase
      .from("suppression_rules")
      .update(validatedData)
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
    if (error instanceof z.ZodError)
      return NextResponse.json({ error: error.issues }, { status: 400 });
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
  const { error } = await supabase
    .from("suppression_rules")
    .delete()
    .eq("id", id);

  if (error)
    return NextResponse.json(
      { error: "INTERNAL_SERVER_ERROR" },
      { status: 500 },
    );
  return NextResponse.json({ success: true });
}
