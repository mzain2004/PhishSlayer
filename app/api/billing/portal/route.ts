import { createClient } from "@/lib/supabase/server";
import { auth } from "@clerk/nextjs/server";
import { NextResponse } from "next/server";
import { z } from "zod";
import { polar } from "@/lib/polar-client";
import { requireRole } from "@/lib/security/rbac";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

async function getBillingPortal() {
  const guard = await requireRole(["org:owner", "org:admin"]);
  if (!guard.ok) return guard.response;

  if (!process.env.POLAR_ACCESS_TOKEN) {
    return NextResponse.json({ error: "Service unavailable" }, { status: 503 });
  }

  try {
    const supabase = await createClient();

    // 1. Get authenticated user
    const { userId } = guard;

    const session = await polar.customerSessions.create({
      externalCustomerId: userId,
    });

    const parsed = z
      .object({ customerPortalUrl: z.string().url() })
      .safeParse(session);

    if (!parsed.success) {
      return NextResponse.json(
        { error: "Failed to create billing portal session" },
        { status: 500 },
      );
    }

    return NextResponse.json({ url: parsed.data.customerPortalUrl });
  } catch (error) {
    console.error("Billing portal route error:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 },
    );
  }
}

export async function GET() {
  return getBillingPortal();
}

export async function POST() {
  return getBillingPortal();
}
