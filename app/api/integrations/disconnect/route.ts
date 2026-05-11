import { NextRequest, NextResponse } from "next/server";
import { auth } from "@clerk/nextjs/server";
import { z } from "zod";
import { supabaseAdmin } from "@/lib/supabase/admin";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

const DisconnectSchema = z.object({
  tool_id: z.string().trim().min(1),
});

export async function DELETE(request: NextRequest) {
  const { orgId } = await auth();
  if (!orgId) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "Invalid request" }, { status: 400 });
  }

  const parsed = DisconnectSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: "Invalid request" }, { status: 400 });
  }

  const { error } = await supabaseAdmin
    .from("org_integrations")
    .delete()
    .eq("org_id", orgId)
    .eq("tool_id", parsed.data.tool_id);

  if (error) {
    return NextResponse.json(
      { error: "Failed to disconnect integration" },
      { status: 500 },
    );
  }

  return NextResponse.json({ success: true });
}
