import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { supabaseAdmin } from "@/lib/supabase/admin";
import { encryptIntegrationSecret } from "@/lib/integration-secrets";
import { getMcpToolById } from "@/lib/mcp-tools";
import { requireRole } from "@/lib/security/rbac";
import { rateLimit, rateLimitResponse } from "@/lib/security/rate-limit";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

const ConnectSchema = z
  .object({
    tool_id: z.string().trim().min(1),
    api_key: z.string().trim().min(1),
    config: z.record(z.string(), z.unknown()).optional(),
  })
  .strict();

export async function POST(request: NextRequest) {
  // Connecting an integration writes a long-lived org-wide secret. Require
  // admin/owner — viewers and analysts shouldn't be able to do this.
  const guard = await requireRole();
  if (!guard.ok) return guard.response;
  const { orgId } = guard;

  const limit = await rateLimit(`integrations:connect:${orgId}`, 10, 60);
  if (!limit.allowed) return rateLimitResponse(limit.retryAfterSeconds);

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
