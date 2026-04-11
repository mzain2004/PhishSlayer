import { createClient } from "@/lib/supabase/server";
import { NextResponse } from "next/server";
import { z } from "zod";
import { polar } from "@/lib/polar-client";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

async function getBillingPortal() {
  try {
    const supabase = await createClient();

    // 1. Get authenticated user
    const {
      data: { user },
      error: authError,
    } = await supabase.auth.getUser();

    if (authError || !user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const session = await polar.customerSessions.create({
      externalCustomerId: user.id,
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
