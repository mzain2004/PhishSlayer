import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { currentUser } from "@clerk/nextjs/server";
import {
  getAuthenticatedUser,
  getServiceRoleClient,
  resolveTenantForUser,
} from "@/lib/tenancy";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

const QuerySchema = z.object({
  tenant: z.string().uuid().optional(),
});

const WEBHOOK_BASE_URL = "https://phishslayer.tech/api/connectors/wazuh";

export async function GET(request: NextRequest) {
  try {
    const user = await getAuthenticatedUser();

    if (!user) {
      return NextResponse.json(
        { success: false, error: "Unauthorized" },
        { status: 401 },
      );
    }

    const parsedQuery = QuerySchema.safeParse({
      tenant: request.nextUrl.searchParams.get("tenant") ?? undefined,
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

    const clerkUser = await currentUser();
    const userEmail = clerkUser?.emailAddresses?.[0]?.emailAddress;
    const userFullName = clerkUser?.fullName || undefined;

    const tenant = await resolveTenantForUser({
      userId: user.id,
      preferredTenantId: parsedQuery.data.tenant,
      tenantNameHint: userFullName || userEmail || undefined,
      userEmail: userEmail || undefined,
      autoCreate: true,
    });

    if (!tenant) {
      return NextResponse.json(
        { success: false, error: "Tenant access denied" },
        { status: 403 },
      );
    }

    const adminClient = getServiceRoleClient();
    const { data, error } = await adminClient
      .from("connectors")
      .select(
        "id, connector_name, manager_ip, is_active, last_seen_at, created_at",
      )
      .eq("organization_id", tenant.tenantId)
      .eq("connector_type", "wazuh")
      .order("created_at", { ascending: false });

    if (error) {
      return NextResponse.json(
        {
          success: false,
          error: `Failed to list Wazuh integrations: ${error.message}`,
        },
        { status: 500 },
      );
    }

    const integrations = (data || []).map((connector) => ({
      id: connector.id,
      name: connector.connector_name,
      manager_ip: connector.manager_ip,
      is_active: connector.is_active,
      last_seen_at: connector.last_seen_at,
      created_at: connector.created_at,
      status: connector.is_active ? "Active" : "Inactive",
    }));

    return NextResponse.json({
      success: true,
      tenant: {
        id: tenant.tenantId,
        name: tenant.tenantName,
        role: tenant.role,
      },
      webhook_url: `${WEBHOOK_BASE_URL}?tenant=${tenant.tenantId}`,
      integrations,
    });
  } catch (error) {
    return NextResponse.json(
      {
        success: false,
        error:
          error instanceof Error
            ? error.message
            : "Failed to load Wazuh integrations",
      },
      { status: 500 },
    );
  }
}
