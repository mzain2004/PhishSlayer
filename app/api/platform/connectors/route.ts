import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";
import { z } from "zod";
import { getAuthenticatedUser, resolveOrganizationForUser } from "@/lib/tenancy";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

const RegisterConnectorSchema = z.object({
  organization_id: z.string().uuid(),
  connector_type: z.enum([
    "wazuh",
    "splunk",
    "crowdstrike",
    "sentinelone",
    "microsoft_defender",
    "elastic",
    "custom",
  ]),
  connector_name: z.string().min(1).max(120),
  config: z.record(z.string(), z.unknown()).default({}),
});

const ListConnectorQuerySchema = z.object({
  organization_id: z.string().uuid().optional(),
});

function getAdminClient() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY;

  if (!url || !key) {
    throw new Error(
      "Missing NEXT_PUBLIC_SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY",
    );
  }

  return createClient(url, key, {
    auth: { autoRefreshToken: false, persistSession: false },
  });
}

function getPingStatus(
  lastPing: string | null,
): "online" | "offline" | "never" {
  if (!lastPing) {
    return "never";
  }

  const lastPingMs = new Date(lastPing).getTime();
  if (Number.isNaN(lastPingMs)) {
    return "offline";
  }

  return Date.now() - lastPingMs <= 5 * 60 * 1000 ? "online" : "offline";
}

export async function POST(request: NextRequest) {
  try {
    const user = await getAuthenticatedUser();
    if (!user) {
      return NextResponse.json(
        { success: false, error: "Unauthorized" },
        { status: 401 },
      );
    }

    const payload = await request.json();
    const parsed = RegisterConnectorSchema.safeParse(payload);

    if (!parsed.success) {
      return NextResponse.json(
        {
          success: false,
          error: "Invalid payload",
          details: parsed.error.flatten(),
        },
        { status: 400 },
      );
    }

    const organization = await resolveOrganizationForUser({
      userId: user.id,
      preferredOrganizationId: parsed.data.organization_id,
      autoCreate: false,
    });

    if (!organization || !["owner", "admin"].includes(organization.role)) {
      return NextResponse.json(
        { success: false, error: "Forbidden" },
        { status: 403 },
      );
    }

    const adminClient = getAdminClient();
    const { data, error } = await adminClient
      .from("connectors")
      .insert({
        ...parsed.data,
        organization_id: organization.organizationId,
      })
      .select("*")
      .single();

    if (error || !data) {
      console.error("[connectors] register error:", error);
      return NextResponse.json(
        {
          success: false,
          error: "Failed to register connector",
        },
        { status: 500 },
      );
    }

    return NextResponse.json({ success: true, connector: data });
  } catch (error) {
    console.error("[connectors] error:", error);
    return NextResponse.json(
      {
        success: false,
        error: "Internal server error",
      },
      { status: 500 },
    );
  }
}

export async function GET(request: NextRequest) {
  try {
    const user = await getAuthenticatedUser();
    if (!user) {
      return NextResponse.json(
        { success: false, error: "Unauthorized" },
        { status: 401 },
      );
    }

    const searchParams = new URL(request.url).searchParams;
    const parsedQuery = ListConnectorQuerySchema.safeParse({
      organization_id: searchParams.get("organization_id") ?? undefined,
    });

    if (!parsedQuery.success) {
      return NextResponse.json(
        {
          success: false,
          error: "Invalid query parameters",
          details: parsedQuery.error.flatten(),
        },
        { status: 400 },
      );
    }

    const organization = await resolveOrganizationForUser({
      userId: user.id,
      preferredOrganizationId: parsedQuery.data.organization_id,
      autoCreate: false,
    });

    if (!organization) {
      return NextResponse.json(
        { success: false, error: "Forbidden" },
        { status: 403 },
      );
    }

    const adminClient = getAdminClient();
    let query = adminClient
      .from("connectors")
      .select("*")
      .order("created_at", { ascending: false });

    query = query.eq("organization_id", organization.organizationId);

    const { data, error } = await query;

    if (error) {
      return NextResponse.json(
        {
          success: false,
          error: "INTERNAL_SERVER_ERROR",
        },
        { status: 500 },
      );
    }

    const connectors = (data || []).map((connector: any) => ({
      ...connector,
      ping_status: getPingStatus(connector.last_ping),
    }));

    return NextResponse.json({ success: true, data: connectors });
  } catch (error) {
    return NextResponse.json(
      {
        success: false,
        error: "INTERNAL_SERVER_ERROR",
      },
      { status: 500 },
    );
  }
}
