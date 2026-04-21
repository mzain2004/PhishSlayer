import { NextResponse } from "next/server";
import dns from "node:dns/promises";
import net from "node:net";
import { createClient } from "@/lib/supabase/server";
import { auth, currentUser } from '@clerk/nextjs/server';
import { z } from "zod";
import { buildSIEMPayload } from "@/lib/siem/stixFormatter";
import { logAuditEvent } from "@/lib/audit/auditLogger";
import { getServerRole } from "@/lib/rbac/serverRole";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

const bodySchema = z.object({
  scanId: z.string().min(1),
  webhookUrl: z
    .string()
    .url()
    .startsWith("https://", { message: "Webhook must use HTTPS" }),
});

const PRIVATE_IPV4_RANGES: Array<[number, number]> = [
  [0x0a000000, 0x0affffff], // 10.0.0.0/8
  [0xac100000, 0xac1fffff], // 172.16.0.0/12
  [0xc0a80000, 0xc0a8ffff], // 192.168.0.0/16
  [0x7f000000, 0x7fffffff], // 127.0.0.0/8
  [0xa9fe0000, 0xa9feffff], // 169.254.0.0/16
];

function ipv4ToInt(ip: string): number {
  return (
    ip
      .split(".")
      .map((octet) => parseInt(octet, 10))
      .reduce((acc, octet) => (acc << 8) + (octet & 0xff), 0) >>> 0
  );
}

function isPrivateIp(address: string): boolean {
  const ipType = net.isIP(address);
  if (ipType === 4) {
    const value = ipv4ToInt(address);
    return PRIVATE_IPV4_RANGES.some(
      ([start, end]) => value >= start && value <= end,
    );
  }

  if (ipType === 6) {
    const normalized = address.toLowerCase();
    return (
      normalized === "::1" ||
      normalized.startsWith("fc") ||
      normalized.startsWith("fd")
    );
  }

  return false;
}

export async function POST(request: Request) {
  try {
    // Auth + role check
    const { userId } = await auth();
    if (!userId) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const supabase = await createClient();

    const role = await getServerRole();
    if (!role || (role !== "super_admin" && role !== "manager")) {
      return NextResponse.json(
        { error: "Insufficient permissions" },
        { status: 403 },
      );
    }

    // Parse body
    let rawBody: unknown;
    try {
      rawBody = await request.json();
    } catch {
      return NextResponse.json({ error: "Invalid JSON body" }, { status: 400 });
    }

    const validation = bodySchema.safeParse(rawBody);
    if (!validation.success) {
      return NextResponse.json(
        { error: validation.error.issues[0]?.message || "Validation failed" },
        { status: 400 },
      );
    }

    const { scanId, webhookUrl } = validation.data;

    const webhookHost = new URL(webhookUrl).hostname;
    let resolved: Array<{ address: string }> = [];
    try {
      resolved = await dns.lookup(webhookHost, { all: true });
    } catch {
      return NextResponse.json(
        { error: "Invalid webhook host" },
        { status: 400 },
      );
    }

    const hasPrivateIp = resolved.some((entry) => isPrivateIp(entry.address));
    if (hasPrivateIp) {
      return NextResponse.json(
        { error: "Private IP ranges are not allowed" },
        { status: 400 },
      );
    }

    // Fetch scan data
    const { data: scanData, error: scanError } = await supabase
      .from("scans")
      .select("*")
      .eq("id", scanId)
      .single();

    if (scanError || !scanData) {
      return NextResponse.json({ error: "Scan not found" }, { status: 404 });
    }

    // Build payload
    const clerkUser = await currentUser();
    const userEmail = clerkUser?.emailAddresses?.[0]?.emailAddress || "";
    const deepScanData = scanData.payload || {};
    const heuristicData = scanData.ai_heuristic || {};
    const payload = buildSIEMPayload(
      scanData,
      deepScanData,
      heuristicData,
      userEmail,
    );

    // Push to webhook with 10s timeout
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), 10000);

    try {
      const res = await fetch(webhookUrl, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
        signal: controller.signal,
      });
      clearTimeout(timeout);

      if (!res.ok) {
        return NextResponse.json(
          { error: `Webhook returned ${res.status}: ${res.statusText}` },
          { status: 502 },
        );
      }
    } catch (err: any) {
      clearTimeout(timeout);
      return NextResponse.json(
        {
          error:
            err?.name === "AbortError"
              ? "Webhook timed out (10s)"
              : "Webhook connection failed",
        },
        { status: 502 },
      );
    }

    const payloadSize = Buffer.byteLength(JSON.stringify(payload), "utf8");

    // Audit
    await logAuditEvent({
      action: "siem_push",
      resource_type: "scan",
      resource_id: scanId,
      details: {
        webhookUrl: webhookUrl.replace(/\/\/.*@/, "//***@"),
        payloadSize,
      },
    });

    return NextResponse.json({
      success: true,
      endpoint: webhookUrl,
      payloadSize,
    });
  } catch (err: any) {
    console.error("SIEM push error:", err);
    return NextResponse.json({ error: "SIEM push failed" }, { status: 500 });
  }
}
