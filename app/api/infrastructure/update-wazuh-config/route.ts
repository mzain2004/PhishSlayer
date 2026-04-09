import { NextRequest, NextResponse } from "next/server";
import { createClient as createSupabaseAdminClient } from "@supabase/supabase-js";
import { createClient as createServerSupabaseClient } from "@/lib/supabase/server";
import { z } from "zod";
import {
  closeSsh,
  connectSsh,
  decodeBase64PrivateKey,
  runSshCommand,
} from "@/lib/infrastructure/wazuhSsh";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

const UpdateConfigPayloadSchema = z.object({
  webhookUrl: z.string().url(),
  webhookSecret: z.string().min(1),
  alertLevel: z.number().int().min(1).max(15).default(7),
});

function getAdminClient() {
  return createSupabaseAdminClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!,
    { auth: { autoRefreshToken: false, persistSession: false } },
  );
}

async function getCallerUserAndRole() {
  const supabase = await createServerSupabaseClient();
  const {
    data: { user },
    error: authError,
  } = await supabase.auth.getUser();

  if (authError || !user) {
    return { user: null, role: null };
  }

  const { data: profile, error: profileError } = await supabase
    .from("profiles")
    .select("role")
    .eq("id", user.id)
    .single();

  if (profileError || !profile) {
    return { user: null, role: null };
  }

  return {
    user,
    role: profile.role as string,
  };
}

function buildIntegrationBlock(webhookUrl: string, webhookSecret: string, alertLevel: number) {
  const normalizedUrl = webhookUrl.replace(/\/+$/, "");

  return [
    "<integration>",
    "  <name>custom-webhook</name>",
    `  <hook_url>${normalizedUrl}/api/connectors/wazuh</hook_url>`,
    `  <level>${alertLevel}</level>`,
    "  <alert_format>json</alert_format>",
    `  <api_key>${webhookSecret}</api_key>`,
    "</integration>",
  ].join("\n");
}

function upsertIntegrationBlock(configText: string, integrationBlock: string): string {
  const customWebhookBlockRegex = /<integration>[\s\S]*?<name>custom-webhook<\/name>[\s\S]*?<\/integration>/m;

  if (customWebhookBlockRegex.test(configText)) {
    return configText.replace(customWebhookBlockRegex, integrationBlock);
  }

  if (configText.includes("</ossec_config>")) {
    return configText.replace("</ossec_config>", `${integrationBlock}\n</ossec_config>`);
  }

  return `${configText}\n${integrationBlock}`;
}

export async function POST(request: NextRequest) {
  const { user, role } = await getCallerUserAndRole();
  if (!user || !role || !["admin", "super_admin"].includes(role)) {
    return NextResponse.json(
      { success: false, error: "Forbidden: admin or super_admin required" },
      { status: 403 },
    );
  }

  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json(
      { success: false, error: "Invalid JSON body" },
      { status: 400 },
    );
  }

  const parsed = UpdateConfigPayloadSchema.safeParse(body);
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

  const sshHost = process.env.WAZUH_MANAGER_IP || "167.172.85.62";
  const sshPrivateKeyBase64 = process.env.DO_SSH_PRIVATE_KEY || "";
  const sshUser = process.env.DO_SSH_USER || "root";

  if (!sshPrivateKeyBase64) {
    return NextResponse.json(
      { success: false, error: "SSH key is not configured" },
      { status: 500 },
    );
  }

  let client = null;

  try {
    client = await connectSsh({
      host: sshHost,
      username: sshUser,
      privateKey: decodeBase64PrivateKey(sshPrivateKeyBase64),
    });

    const currentConfig = await runSshCommand(
      client,
      "cat /var/ossec/etc/ossec.conf",
    );

    const integrationBlock = buildIntegrationBlock(
      parsed.data.webhookUrl,
      parsed.data.webhookSecret,
      parsed.data.alertLevel,
    );
    const updatedConfig = upsertIntegrationBlock(currentConfig, integrationBlock);

    const encoded = Buffer.from(updatedConfig, "utf8").toString("base64");
    await runSshCommand(
      client,
      `printf '%s' '${encoded}' | base64 -d > /var/ossec/etc/ossec.conf`,
    );

    await runSshCommand(client, "systemctl restart wazuh-manager");
    await runSshCommand(client, "sleep 5");

    const serviceStatus = await runSshCommand(
      client,
      "systemctl is-active wazuh-manager || true",
    );

    const restarted = serviceStatus.trim() === "active";
    if (!restarted) {
      throw new Error("Wazuh manager did not recover after restart");
    }

    const adminClient = getAdminClient();
    await adminClient.from("audit_logs").insert({
      action: "WAZUH_CONFIG_UPDATED",
      severity: "medium",
      metadata: {
        webhookUrl: parsed.data.webhookUrl,
        alertLevel: parsed.data.alertLevel,
      },
      actor_id: user.id,
      created_at: new Date().toISOString(),
    });

    return NextResponse.json({
      success: true,
      restarted: true,
      config_applied: {
        webhookUrl: parsed.data.webhookUrl,
        alertLevel: parsed.data.alertLevel,
      },
    });
  } catch (error) {
    console.error("[update-wazuh-config] Failed to apply config", error);
    return NextResponse.json(
      { success: false, error: "Failed to update Wazuh configuration" },
      { status: 500 },
    );
  } finally {
    closeSsh(client);
  }
}
