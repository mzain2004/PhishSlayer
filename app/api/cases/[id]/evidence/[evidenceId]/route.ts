import { NextRequest, NextResponse } from "next/server";
import { auth } from "@clerk/nextjs/server";
import { createClient } from "@/lib/supabase/server";
import { logCustodyEvent } from "@/lib/forensics/chainOfCustody";
import { requireRole } from "@/lib/security/rbac";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ id: string; evidenceId: string }> },
) {
  const { orgId } = await auth();
  const { id, evidenceId } = await params;
  if (!orgId)
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const supabase = await createClient();
  const { data, error } = await supabase
    .from("case_evidence")
    .select("*")
    .eq("id", evidenceId)
    .eq("case_id", id)
    .eq("organization_id", orgId)
    .single();

  if (error || !data)
    return NextResponse.json({ error: "Evidence not found" }, { status: 404 });
  return NextResponse.json(data);
}

export async function DELETE(
  req: NextRequest,
  { params }: { params: Promise<{ id: string; evidenceId: string }> },
) {
  const guard = await requireRole(["org:owner", "org:admin"]);
  if (!guard.ok) return guard.response;

  const { orgId, userId } = guard;
  const { id, evidenceId } = await params;

  const supabase = await createClient();
  const { error } = await supabase
    .from("case_evidence")
    .update({ deleted_at: new Date().toISOString() })
    .eq("id", evidenceId)
    .eq("case_id", id)
    .eq("organization_id", orgId);

  if (error)
    return NextResponse.json(
      { error: "INTERNAL_SERVER_ERROR" },
      { status: 500 },
    );

  await logCustodyEvent(id, userId, "evidence_removed", { evidenceId });

  return NextResponse.json({ success: true });
}
