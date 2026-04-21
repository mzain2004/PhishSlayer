import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { auth } from '@clerk/nextjs/server';
import { z } from "zod";
import { runPortPatrol } from "@/lib/recon/portPatrol";
import { sanitizeTarget } from "@/lib/security/safeCompare";
import { logAuditEvent } from "@/lib/audit/auditLogger";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

const bodySchema = z.object({
  target: z.string().min(1).max(253),
});

export async function POST(request: Request) {
  try {
    // Auth check
    const { userId } = await auth();
  if (!userId) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const supabase = await createClient();

    // Parse & validate body
    let rawBody: unknown;
    try {
      rawBody = await request.json();
    } catch {
      return NextResponse.json({ error: "Invalid JSON body" }, { status: 400 });
    }

    const validation = bodySchema.safeParse(rawBody);
    if (!validation.success) {
      return NextResponse.json({ error: "Validation failed" }, { status: 400 });
    }

    // Sanitize target
    const { target, error: sanitizeError } = sanitizeTarget(
      validation.data.target,
    );
    if (sanitizeError || !target) {
      return NextResponse.json(
        { error: sanitizeError || "Invalid target" },
        { status: 400 },
      );
    }

    // Run port patrol
    const report = await runPortPatrol(target);

    // Audit
    await logAuditEvent({
      action: "port_patrol_scan",
      resource_type: "scan",
      resource_id: target,
      details: {
        openPorts: report.openPorts.length,
        overallRisk: report.overallRisk,
        resolvedIp: report.resolvedIp,
      },
    });

    return NextResponse.json(report);
  } catch (err: any) {
    console.error("Port patrol error:", err);
    return NextResponse.json(
      { error: err?.message || "Port scan failed. Please try again." },
      { status: 500 },
    );
  }
}
