import { NextRequest, NextResponse } from "next/server";
import { createClient as createSupabaseAdminClient } from "@supabase/supabase-js";
import { createClient as createServerSupabaseClient } from "@/lib/supabase/server";
import { auth } from '@clerk/nextjs/server';
import {
  closeSsh,
  connectSsh,
  decodeBase64PrivateKey,
  runSshCommand,
} from "@/lib/infrastructure/wazuhSsh";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

type ServiceName = "wazuh-manager" | "wazuh-indexer" | "wazuh-dashboard";

type ServicesStatus = Record<ServiceName, "active" | "inactive">;

const WAZUH_SERVICES: ServiceName[] = [
  "wazuh-manager",
  "wazuh-indexer",
  "wazuh-dashboard",
];

function getAdminClient() {
  return createSupabaseAdminClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!,
    { auth: { autoRefreshToken: false, persistSession: false } },
  );
}

function getAuthHeaderValue(request: NextRequest): string {
  return request.headers.get("authorization") || "";
}

function isCronAuthorized(request: NextRequest): boolean {
  const cronSecret = process.env.CRON_SECRET;
  if (!cronSecret) {
    return false;
  }

  return getAuthHeaderValue(request) === `Bearer ${cronSecret}`;
}

async function hasPrivilegedRole(): Promise<boolean> {
  const supabase = await createServerSupabaseClient();
  const { userId } = await auth();
    if (!userId) {
    return false;
  }

  const { data: profile, error: profileError } = await supabase
    .from("profiles")
    .select("role")
    .eq("id", userId)
    .single();

  if (profileError || !profile) {
    return false;
  }

  return ["admin", "manager", "super_admin"].includes(profile.role);
}

function parseDiskPercent(dfOutput: string): number {
  const lines = dfOutput
    .split("\n")
    .map((line) => line.trim())
    .filter(Boolean);
  const dataLine = lines[1] || lines[0] || "";
  const match = dataLine.match(/(\d+)%/);
  return match ? Number(match[1]) : 0;
}

function parseMemoryPercent(freeOutput: string): number {
  const memLine = freeOutput
    .split("\n")
    .map((line) => line.trim())
    .find((line) => line.startsWith("Mem:"));

  if (!memLine) {
    return 0;
  }

  const parts = memLine.split(/\s+/);
  const total = Number(parts[1] || 0);
  const used = Number(parts[2] || 0);

  if (total <= 0) {
    return 0;
  }

  return Math.round((used / total) * 100);
}

function parseActiveAgents(controlStatusOutput: string): number {
  const match = controlStatusOutput.match(/(\d+)/);
  return match ? Number(match[1]) : 0;
}

async function triggerInfraEscalation(
  serviceName: ServiceName,
  baseUrl: string,
) {
  try {
    await fetch(`${baseUrl}/api/actions/escalate`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        AGENT_SECRET: process.env.AGENT_SECRET || "",
      },
      body: JSON.stringify({
        alertId: `INFRA-WAZUH-DOWN-${Date.now()}`,
        severity: "critical",
        title: "Wazuh Service Down - Auto-restart Failed",
        description: `Service: ${serviceName} is not responding`,
        recommendedAction: "MANUAL_REVIEW",
      }),
    });
  } catch (error) {
    console.error("[wazuh-health] Failed to trigger escalation", error);
  }
}

async function collectWazuhHealth(request: NextRequest) {
  const adminClient = getAdminClient();
  const sshHost = process.env.WAZUH_MANAGER_IP || "167.172.85.62";
  const sshPrivateKeyBase64 = process.env.DO_SSH_PRIVATE_KEY || "";
  const sshUser = process.env.DO_SSH_USER || "root";

  let autoRestarted = false;
  let diskPercent = 0;
  let memoryPercent = 0;
  let activeAgents = 0;
  const services: ServicesStatus = {
    "wazuh-manager": "inactive",
    "wazuh-indexer": "inactive",
    "wazuh-dashboard": "inactive",
  };

  if (!sshPrivateKeyBase64) {
    const overall = "down" as const;
    await adminClient.from("infrastructure_health").insert({
      service: "wazuh",
      status: overall,
      services_status: services,
      disk_usage_percent: diskPercent,
      memory_usage_percent: memoryPercent,
      active_agents: activeAgents,
      auto_restarted: autoRestarted,
      checked_at: new Date().toISOString(),
    });

    return {
      success: true,
      overall,
      services,
      disk_percent: diskPercent,
      memory_percent: memoryPercent,
      active_agents: activeAgents,
      auto_restarted: autoRestarted,
    };
  }

  let client = null;

  try {
    client = await connectSsh({
      host: sshHost,
      username: sshUser,
      privateKey: decodeBase64PrivateKey(sshPrivateKeyBase64),
    });

    for (const serviceName of WAZUH_SERVICES) {
      const statusRaw = await runSshCommand(
        client,
        `systemctl is-active ${serviceName} || true`,
      );
      services[serviceName] =
        statusRaw.trim() === "active" ? "active" : "inactive";
    }

    const failedServices = WAZUH_SERVICES.filter(
      (serviceName) => services[serviceName] !== "active",
    );

    if (failedServices.length > 0) {
      for (const serviceName of failedServices) {
        autoRestarted = true;
        await runSshCommand(client, `systemctl restart ${serviceName}`);
      }

      await new Promise((resolve) => setTimeout(resolve, 10000));

      for (const serviceName of failedServices) {
        const statusRaw = await runSshCommand(
          client,
          `systemctl is-active ${serviceName} || true`,
        );
        services[serviceName] =
          statusRaw.trim() === "active" ? "active" : "inactive";

        if (services[serviceName] !== "active") {
          await triggerInfraEscalation(serviceName, request.nextUrl.origin);
        }
      }
    }

    const controlStatus = await runSshCommand(
      client,
      "/var/ossec/bin/wazuh-control status || true",
    );
    const dfOutput = await runSshCommand(client, "df -h /var/ossec || true");
    const freeOutput = await runSshCommand(client, "free -m || true");

    activeAgents = parseActiveAgents(controlStatus);
    diskPercent = parseDiskPercent(dfOutput);
    memoryPercent = parseMemoryPercent(freeOutput);
  } catch (error) {
    console.error("[wazuh-health] SSH health check failed", error);
  } finally {
    closeSsh(client);
  }

  const anyInactive = WAZUH_SERVICES.some(
    (serviceName) => services[serviceName] !== "active",
  );
  const thresholdWarning = diskPercent > 80 || memoryPercent > 85;
  const overall: "healthy" | "degraded" | "down" = anyInactive
    ? "down"
    : thresholdWarning || autoRestarted
      ? "degraded"
      : "healthy";

  try {
    await adminClient.from("infrastructure_health").insert({
      service: "wazuh",
      status: overall,
      services_status: services,
      disk_usage_percent: diskPercent,
      memory_usage_percent: memoryPercent,
      active_agents: activeAgents,
      auto_restarted: autoRestarted,
      checked_at: new Date().toISOString(),
    });
  } catch (error) {
    console.error("[wazuh-health] Failed to persist health row", error);
  }

  return {
    success: true,
    overall,
    services,
    disk_percent: diskPercent,
    memory_percent: memoryPercent,
    active_agents: activeAgents,
    auto_restarted: autoRestarted,
  };
}

export async function GET(request: NextRequest) {
  const apiKey = process.env.WAZUH_API_KEY;
  if (!apiKey) {
    return NextResponse.json(
      { error: "WAZUH_API_KEY not configured" },
      { status: 401 }
    );
  }

  const authHeader = request.headers.get("authorization");
  if (authHeader !== `Bearer ${apiKey}`) {
    const cronAuthorized = isCronAuthorized(request);
    if (!cronAuthorized) {
      const roleAuthorized = await hasPrivilegedRole();
      if (!roleAuthorized) {
        return NextResponse.json(
          { success: false, error: "Unauthorized" },
          { status: 401 },
        );
      }
    }
  }

  const result = await collectWazuhHealth(request);
  return NextResponse.json(result, { status: 200 });
}
