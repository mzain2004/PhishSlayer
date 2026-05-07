import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { currentUser } from "@clerk/nextjs/server";
import {
  getAuthenticatedUser,
  getServiceRoleClient,
  resolveOrganizationForUser,
} from "@/lib/tenancy";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

const QuerySchema = z.object({
  organization: z.string().uuid().optional(),
});

const WEBHOOK_BASE_URL = "https://phishslayer.tech/api/connectors/wazuh";

import { auth } from "@clerk/nextjs/server";

export async function GET(request: NextRequest) {
  try {
    const { userId, orgId } = await auth();

    if (!userId) {
      return NextResponse.json(
        { success: false, error: "Unauthorized" },
        { status: 401 },
      );
    }

    const parsedQuery = QuerySchema.safeParse({
      organization:
        request.nextUrl.searchParams.get("organization") ?? undefined,
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

    const organization = await resolveOrganizationForUser({
      userId: userId,
      preferredOrganizationId: parsedQuery.data.organization,
      organizationNameHint: userFullName || userEmail || undefined,
      userEmail: userEmail || undefined,
      autoCreate: true,
    });

    if (!organization) {
      return NextResponse.json(
        { success: false, error: "Organization access denied" },
        { status: 403 },
      );
    }

    const adminClient = getServiceRoleClient();
    const { data, error } = await adminClient
      .from("connectors")
      .select(
        "id, connector_name, manager_ip, is_active, last_seen_at, created_at",
      )
      .eq("organization_id", organization.organizationId)
      .eq("connector_type", "wazuh")
      .order("created_at", { ascending: false });

    if (error) {
      return NextResponse.json(
        {
          success: false,
          error: "INTERNAL_SERVER_ERROR",
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
      organization: {
        id: organization.organizationId,
        name: organization.organizationName,
        role: organization.role,
      },
      webhook_url: `${WEBHOOK_BASE_URL}?organization=${organization.organizationId}`,
      integrations,
    });
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
