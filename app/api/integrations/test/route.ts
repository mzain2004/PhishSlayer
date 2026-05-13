import { NextRequest, NextResponse } from "next/server";
import { auth } from "@clerk/nextjs/server";
import { z } from "zod";
import { supabaseAdmin } from "@/lib/supabase/admin";
import { decryptIntegrationSecret } from "@/lib/integration-secrets";
import { getMcpToolById } from "@/lib/mcp-tools";
import { testMcpIntegration } from "@/lib/mcp-integration-tests";
import { rateLimit, rateLimitResponse } from "@/lib/security/rate-limit";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

const TestSchema = z
  .object({
    tool_id: z.string().trim().min(1),
  })
  .strict();

export async function POST(request: NextRequest) {
  const { userId, orgId } = await auth();
  if (!userId || !orgId) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const limit = await rateLimit(`integrations:test:${orgId}`, 20, 60);
  if (!limit.allowed) return rateLimitResponse(limit.retryAfterSeconds);

  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json(
      { success: false, latency_ms: 0 },
      { status: 400 },
    );
  }

  const parsed = TestSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json(
      { success: false, latency_ms: 0 },
      { status: 400 },
    );
  }

  const tool = getMcpToolById(parsed.data.tool_id);
  if (!tool) {
    return NextResponse.json(
      { success: false, latency_ms: 0 },
      { status: 404 },
    );
  }

  const { data: integration } = await supabaseAdmin
    .from("org_integrations")
    .select("encrypted_key, config")
    .eq("org_id", orgId)
    .eq("tool_id", tool.id)
    .maybeSingle();

  if (!integration?.encrypted_key) {
    if (tool.tier !== "all") {
      return NextResponse.json(
        { success: false, latency_ms: 0 },
        { status: 404 },
      );
    }

    const sharedTest = await testMcpIntegration(
      tool,
      "",
      (integration?.config as Record<string, unknown>) ?? {},
    );
    return NextResponse.json({
      success: sharedTest.success,
      latency_ms: sharedTest.latencyMs,
    });
  }

  let apiKey: string;
  try {
    apiKey = decryptIntegrationSecret(integration.encrypted_key);
  } catch {
    return NextResponse.json(
      { success: false, latency_ms: 0 },
      { status: 500 },
    );
  }

  const config = (integration.config as Record<string, unknown>) ?? {};
  const result = await testMcpIntegration(tool, apiKey, config);

  return NextResponse.json({
    success: result.success,
    latency_ms: result.latencyMs,
  });
}
