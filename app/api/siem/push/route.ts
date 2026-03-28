import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
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

export async function POST(request: Request) {
  try {
    // Auth + role check
    const supabase = await createClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();
    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

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
    const deepScanData = scanData.payload || {};
    const heuristicData = scanData.ai_heuristic || {};
    const payload = buildSIEMPayload(
      scanData,
      deepScanData,
      heuristicData,
      user.email || "",
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
