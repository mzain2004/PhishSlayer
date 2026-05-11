import { NextRequest, NextResponse } from "next/server";
import { auth } from "@clerk/nextjs/server";
import { z } from "zod";
import { supabaseAdmin } from "@/lib/supabase/admin";
import { encryptIntegrationSecret } from "@/lib/integration-secrets";
import { getMcpToolById } from "@/lib/mcp-tools";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

const ConnectSchema = z.object({
  tool_id: z.string().trim().min(1),
  api_key: z.string().trim().min(1),
  config: z.record(z.string(), z.unknown()).optional(),
});

export async function POST(request: NextRequest) {
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

  const parsed = ConnectSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: "Invalid request" }, { status: 400 });
  }

  const tool = getMcpToolById(parsed.data.tool_id);
  if (!tool) {
    return NextResponse.json(
      { error: "Integration not found" },
      { status: 404 },
    );
  }

  let encryptedKey: string;
  try {
    encryptedKey = encryptIntegrationSecret(parsed.data.api_key);
  } catch {
    return NextResponse.json(
      { error: "Encryption unavailable" },
      { status: 500 },
    );
  }

  const { error } = await supabaseAdmin.from("org_integrations").upsert(
    {
      org_id: orgId,
      tool_id: tool.id,
      encrypted_key: encryptedKey,
      config: parsed.data.config ?? {},
      connected_at: new Date().toISOString(),
    },
    { onConflict: "org_id,tool_id" },
  );

  if (error) {
    return NextResponse.json(
      { error: "Failed to save integration" },
      { status: 500 },
    );
  }

  return NextResponse.json({ success: true });
}
