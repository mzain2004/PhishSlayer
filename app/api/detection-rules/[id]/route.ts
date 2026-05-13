import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { parseSigmaRule } from "@/lib/detection/sigmaParser";
import { auth } from "@clerk/nextjs/server";
import { requireRole } from "@/lib/security/rbac";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  const { userId, orgId } = await auth();
  if (!userId || !orgId)
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { id } = await params;
  const supabase = await createClient();
  const { data, error } = await supabase
    .from("detection_rules")
    .select("*")
    .eq("id", id)
    .eq("organization_id", orgId)
    .single();
  if (error)
    return NextResponse.json(
      { error: "INTERNAL_SERVER_ERROR" },
      { status: 500 },
    );
  return NextResponse.json(data);
}

export async function PUT(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  const { userId, orgId } = await auth();
  if (!userId || !orgId)
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { id } = await params;
  const body = await req.json();
  const supabase = await createClient();

  if (body.type === "sigma" && body.rule_content) {
    try {
      body.parsed_rule = parseSigmaRule(body.rule_content);
    } catch (e: any) {
      return NextResponse.json({ error: e.message }, { status: 400 });
    }
  }

  const { data, error } = await supabase
    .from("detection_rules")
    .update(body)
    .eq("id", id)
    .eq("organization_id", orgId)
    .select()
    .single();

  if (error)
    return NextResponse.json(
      { error: "INTERNAL_SERVER_ERROR" },
      { status: 500 },
    );
  return NextResponse.json(data);
}

export async function DELETE(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  const guard = await requireRole(["org:owner", "org:admin"]);
  if (!guard.ok) return guard.response;

  const { orgId } = guard;

  const { id } = await params;
  const supabase = await createClient();
  const { error } = await supabase
    .from("detection_rules")
    .delete()
    .eq("id", id)
    .eq("organization_id", orgId);
  if (error)
    return NextResponse.json(
      { error: "INTERNAL_SERVER_ERROR" },
      { status: 500 },
    );
  return new Response(null, { status: 204 });
}
