import { randomBytes } from "node:crypto";
import { NextRequest, NextResponse } from "next/server";
import { hash as bcryptHash } from "bcryptjs";
import { z } from "zod";
import { currentUser } from "@clerk/nextjs/server";
import {
  getAuthenticatedUser,
  getServiceRoleClient,
  resolveOrganizationForUser,
} from "@/lib/tenancy";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

const GenerateKeySchema = z.object({
  name: z.string().trim().min(1).max(120),
  manager_ip: z.string().trim().min(1).max(255).optional().nullable(),
  organization_id: z.string().uuid().optional(),
});

const WEBHOOK_BASE_URL = "https://phishslayer.tech/api/connectors/wazuh";
const BCRYPT_ROUNDS = 12;

function generateWebhookKey(): string {
  const randomSection = randomBytes(45).toString("hex");
  return `ps_wh_${randomSection}`;
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

    let payload: unknown;
    try {
      payload = await request.json();
    } catch {
      return NextResponse.json(
        { success: false, error: "Invalid JSON payload" },
        { status: 400 },
      );
    }

    const parsed = GenerateKeySchema.safeParse(payload);

    if (!parsed.success) {
      return NextResponse.json(
        {
          success: false,
          error: "Validation failed",
          details: parsed.error.flatten(),
        },
        { status: 400 },
      );
    }

    const clerkUser = await currentUser();
    const userEmail = clerkUser?.emailAddresses?.[0]?.emailAddress;
    const userFullName = clerkUser?.fullName || undefined;

    const organization = await resolveOrganizationForUser({
      userId: user.id,
      preferredOrganizationId: parsed.data.organization_id,
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

    const plaintextApiKey = generateWebhookKey();
    const apiKeyHash = await bcryptHash(plaintextApiKey, BCRYPT_ROUNDS);

    const adminClient = getServiceRoleClient();
    const { data: connector, error: connectorError } = await adminClient
      .from("connectors")
      .insert({
        organization_id: organization.organizationId,
        connector_type: "wazuh",
        connector_name: parsed.data.name,
        manager_ip: parsed.data.manager_ip ?? null,
        api_key_hash: apiKeyHash,
        is_active: true,
        config: {},
      })
      .select("id")
      .single();

    if (connectorError || !connector) {
      return NextResponse.json(
        {
          success: false,
          error: `Failed to create integration key: ${connectorError?.message || "insert failed"}`,
        },
        { status: 500 },
      );
    }

    return NextResponse.json({
      success: true,
      organization_id: organization.organizationId,
      connector_id: connector.id,
      api_key: plaintextApiKey,
      webhook_url: `${WEBHOOK_BASE_URL}?organization=${organization.organizationId}`,
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
