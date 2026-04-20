import { NextRequest, NextResponse } from "next/server";
import { createClient as createSupabaseAdminClient } from "@supabase/supabase-js";
import { createClient as createServerSupabaseClient } from "@/lib/supabase/server";
import { getWazuhApiToken } from "@/lib/wazuh-client";
import https from "https";
import { z } from "zod";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

const EnrollPayloadSchema = z.object({
  agentName: z.string().min(1),
  agentIp: z.string().min(1),
  agentOs: z.enum(["ubuntu", "debian", "centos", "windows"]),
  agentArch: z.enum(["x86_64", "aarch64", "i386"]),
});

type WazuhEnrollment = {
  agentId: string;
  agentKey: string;
};

function getAdminClient() {
  return createSupabaseAdminClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!,
    { auth: { autoRefreshToken: false, persistSession: false } },
  );
}

async function getCallerProfile() {
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

function extractEnrollmentPayload(apiResponse: unknown): WazuhEnrollment {
  const parsed = z
    .object({
      data: z
        .object({
          id: z.union([z.string(), z.number()]).optional(),
          key: z.string().optional(),
          affected_items: z
            .array(
              z.object({
                id: z.union([z.string(), z.number()]).optional(),
                key: z.string().optional(),
              }),
            )
            .optional(),
        })
        .optional(),
    })
    .safeParse(apiResponse);

  if (!parsed.success) {
    throw new Error("Unexpected Wazuh API response shape");
  }

  const directId = parsed.data.data?.id;
  const directKey = parsed.data.data?.key;
  const listItem = parsed.data.data?.affected_items?.[0];
  const resolvedId = directId ?? listItem?.id;
  const resolvedKey = directKey ?? listItem?.key;

  if (!resolvedId || !resolvedKey) {
    throw new Error("Wazuh API did not return agent credentials");
  }

  return {
    agentId: String(resolvedId),
    agentKey: resolvedKey,
  };
}

function requestWazuhEnrollment(
  agentName: string,
  managerIp: string,
  token: string,
): Promise<WazuhEnrollment> {
  return new Promise((resolve, reject) => {
    const requestBody = JSON.stringify({ name: agentName });

    const req = https.request(
      {
        hostname: managerIp,
        port: 55000,
        path: "/agents",
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "Content-Length": Buffer.byteLength(requestBody),
          Authorization: `Bearer ${token}`,
        },
      },
      (res) => {
        let responseBody = "";

        res.on("data", (chunk: Buffer) => {
          responseBody += chunk.toString();
        });

        res.on("end", () => {
          if (
            !res.statusCode ||
            res.statusCode < 200 ||
            res.statusCode >= 300
          ) {
            reject(
              new Error(
                `Wazuh API request failed with status ${res.statusCode || 0}`,
              ),
            );
            return;
          }

          try {
            const parsed = JSON.parse(responseBody);
            resolve(extractEnrollmentPayload(parsed));
          } catch (error) {
            reject(error);
          }
        });
      },
    );

    req.on("error", (error) => reject(error));
    req.write(requestBody);
    req.end();
  });
}

function getLinuxArch(agentArch: "x86_64" | "aarch64" | "i386") {
  if (agentArch === "aarch64") {
    return "arm64";
  }
  if (agentArch === "i386") {
    return "i386";
  }

  return "amd64";
}

function buildInstallScript(
  agentName: string,
  agentOs: "ubuntu" | "debian" | "centos" | "windows",
  agentArch: "x86_64" | "aarch64" | "i386",
  managerIp: string,
): string {
  const linuxArch = getLinuxArch(agentArch);

  if (agentOs === "ubuntu" || agentOs === "debian") {
    return [
      `curl -so wazuh-agent.deb https://packages.wazuh.com/4.x/apt/pool/main/w/wazuh-agent/wazuh-agent_4.9.2-1_${linuxArch}.deb &&`,
      `WAZUH_MANAGER='${managerIp}' WAZUH_AGENT_NAME='${agentName}' dpkg -i ./wazuh-agent.deb &&`,
      "systemctl daemon-reload &&",
      "systemctl enable wazuh-agent &&",
      "systemctl start wazuh-agent",
    ].join("\n");
  }

  if (agentOs === "centos") {
    return [
      `curl -so wazuh-agent.rpm https://packages.wazuh.com/4.x/yum/wazuh-agent-4.9.2-1.${agentArch}.rpm &&`,
      `WAZUH_MANAGER='${managerIp}' WAZUH_AGENT_NAME='${agentName}' rpm -ihv ./wazuh-agent.rpm &&`,
      "systemctl daemon-reload &&",
      "systemctl enable wazuh-agent &&",
      "systemctl start wazuh-agent",
    ].join("\n");
  }

  return [
    "$ProgressPreference = 'SilentlyContinue'",
    `$manager = '${managerIp}'`,
    `$agentName = '${agentName}'`,
    "Invoke-WebRequest -Uri 'https://packages.wazuh.com/4.x/windows/wazuh-agent-4.9.2-1.msi' -OutFile 'wazuh-agent.msi'",
    "msiexec.exe /i wazuh-agent.msi /q WAZUH_MANAGER=$manager WAZUH_AGENT_NAME=$agentName",
    "Start-Service -Name WazuhSvc",
  ].join("\n");
}

export async function POST(request: NextRequest) {
  const { user, role } = await getCallerProfile();

  if (!user || !role || !["admin", "manager", "super_admin"].includes(role)) {
    return NextResponse.json(
      { success: false, error: "Forbidden: insufficient privileges" },
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

  const parsedPayload = EnrollPayloadSchema.safeParse(body);
  if (!parsedPayload.success) {
    return NextResponse.json(
      {
        success: false,
        error: "Validation failed",
        details: parsedPayload.error.flatten(),
      },
      { status: 400 },
    );
  }

  const managerIp = process.env.WAZUH_MANAGER_IP;
  const sshUser = process.env.WAZUH_SSH_USER;

  if (!managerIp || !sshUser) {
    return NextResponse.json(
      { success: false, error: "Wazuh manager configuration is missing" },
      { status: 500 },
    );
  }

  try {
    const { agentName, agentIp, agentOs, agentArch } = parsedPayload.data;
    const wazuhToken = await getWazuhApiToken();
    const enrollment = await requestWazuhEnrollment(
      agentName,
      managerIp,
      wazuhToken,
    );

    const installScript = buildInstallScript(
      agentName,
      agentOs,
      agentArch,
      managerIp,
    );

    const adminClient = getAdminClient();
    const { error: insertError } = await adminClient
      .from("enrolled_agents")
      .insert({
        agent_id: enrollment.agentId,
        agent_name: agentName,
        agent_ip: agentIp,
        agent_os: agentOs,
        status: "pending_connection",
        enrolled_by: user.id,
        enrolled_at: new Date().toISOString(),
      });

    if (insertError) {
      throw new Error(insertError.message);
    }

    return NextResponse.json({
      success: true,
      agent_id: enrollment.agentId,
      agent_key: enrollment.agentKey,
      install_script: installScript,
      manager_ssh_user: sshUser,
      instructions: "Paste this script into your target machine terminal",
    });
  } catch (error) {
    console.error("[enroll-agent] Enrollment failed", error);
    return NextResponse.json(
      { success: false, error: "Failed to enroll agent" },
      { status: 500 },
    );
  }
}
