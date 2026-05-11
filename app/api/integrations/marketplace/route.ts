import { NextResponse } from "next/server";
import { auth } from "@clerk/nextjs/server";
import { supabaseAdmin } from "@/lib/supabase/admin";
import {
  getMcpTools,
  type MCPToolCategory,
  type OrgIntegrationStatus,
} from "@/lib/mcp-tools";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

type MarketplaceIntegration = ReturnType<typeof getMcpTools>[number] & {
  status: OrgIntegrationStatus;
  connected: boolean;
  connectedAt: string | null;
  config: Record<string, unknown> | null;
  shared: boolean;
  category: MCPToolCategory;
};

export async function GET() {
  const { orgId } = await auth();
  if (!orgId) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const [organizationResult, integrationsResult] = await Promise.all([
    supabaseAdmin
      .from("organizations")
      .select("tier")
      .eq("id", orgId)
      .maybeSingle(),
    supabaseAdmin
      .from("org_integrations")
      .select("tool_id, config, connected_at")
      .eq("org_id", orgId),
  ]);

  const orgTier = organizationResult.data?.tier ?? "free";
  const connectedByToolId = new Map(
    (integrationsResult.data ?? []).map((row) => [row.tool_id, row]),
  );

  const tools: MarketplaceIntegration[] = getMcpTools().map((tool) => {
    const connection = connectedByToolId.get(tool.id);
    const connected = Boolean(connection);
    const shared = !connected && tool.tier === "all";
    const status: OrgIntegrationStatus = connected
      ? "connected"
      : shared
        ? "using_shared"
        : "not_connected";

    return {
      ...tool,
      status,
      connected,
      connectedAt: connection?.connected_at ?? null,
      config: (connection?.config as Record<string, unknown> | null) ?? null,
      shared,
    };
  });

  return NextResponse.json({
    orgTier,
    tools,
  });
}
