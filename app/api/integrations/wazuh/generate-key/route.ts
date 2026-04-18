import { randomBytes } from "node:crypto";
import { NextRequest, NextResponse } from "next/server";
import { hash as bcryptHash } from "bcryptjs";
import { z } from "zod";
import {
  getAuthenticatedUser,
  getServiceRoleClient,
  resolveTenantForUser,
} from "@/lib/tenancy";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

const GenerateKeySchema = z.object({
  name: z.string().trim().min(1).max(120),
  manager_ip: z.string().trim().min(1).max(255).optional().nullable(),
  tenant_id: z.string().uuid().optional(),
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

    const tenant = await resolveTenantForUser({
      userId: user.id,
      preferredTenantId: parsed.data.tenant_id,
      tenantNameHint:
        (user.user_metadata?.full_name as string | undefined) ||
        user.email ||
        undefined,
      autoCreate: true,
    });

    if (!tenant) {
      return NextResponse.json(
        { success: false, error: "Tenant access denied" },
        { status: 403 },
      );
    }

    const plaintextApiKey = generateWebhookKey();
    const apiKeyHash = await bcryptHash(plaintextApiKey, BCRYPT_ROUNDS);

    const adminClient = getServiceRoleClient();
    const { data: integration, error: integrationError } = await adminClient
      .from("wazuh_integrations")
      .insert({
        tenant_id: tenant.tenantId,
        name: parsed.data.name,
        manager_ip: parsed.data.manager_ip ?? null,
        api_key_hash: apiKeyHash,
        is_active: true,
      })
      .select("id")
      .single();

    if (integrationError || !integration) {
      return NextResponse.json(
        {
          success: false,
          error: `Failed to create integration key: ${integrationError?.message || "insert failed"}`,
        },
        { status: 500 },
      );
    }

    return NextResponse.json({
      success: true,
      tenant_id: tenant.tenantId,
      integration_id: integration.id,
      api_key: plaintextApiKey,
      webhook_url: `${WEBHOOK_BASE_URL}?tenant=${tenant.tenantId}`,
    });
  } catch (error) {
    return NextResponse.json(
      {
        success: false,
        error:
          error instanceof Error
            ? error.message
            : "Failed to generate Wazuh key",
      },
      { status: 500 },
    );
  }
}
