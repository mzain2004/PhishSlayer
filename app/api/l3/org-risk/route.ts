import { NextResponse } from "next/server";
import { auth } from "@clerk/nextjs/server";
import { createClient } from "@/lib/supabase/server";
import { calculateOrgRisk } from "@/lib/l3/orgRiskScore";
import { z } from "zod";

const schema = z.object({ organizationId: z.string().optional() }).strict();

export const dynamic = 'force-dynamic';
export const runtime = 'nodejs';

export async function GET(req: Request) {
  const { userId, orgId: authOrgId } = await auth();
  if (!userId) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { searchParams } = new URL(req.url);
  const organizationId = searchParams.get("organizationId") || authOrgId;
  if (!organizationId) return NextResponse.json({ error: "organizationId required" }, { status: 400 });

  const supabase = await createClient();
  const { data: org } = await supabase.from("organizations").select("risk_score, risk_level, risk_updated_at").eq("id", organizationId).single();

  return NextResponse.json(org);
}

export async function POST(req: Request) {
  const { userId, orgId: authOrgId } = await auth();
  if (!userId) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  try {
    const body = await req.json();
    const parsed = schema.safeParse(body);
    if (!parsed.success) return NextResponse.json({ error: parsed.error.issues }, { status: 400 });
    const { organizationId } = parsed.data;
    const finalOrgId = organizationId || authOrgId;
    if (!finalOrgId) return NextResponse.json({ error: "organizationId required" }, { status: 400 });

    const supabase = await createClient();
    const risk = await calculateOrgRisk(supabase, finalOrgId);

    return NextResponse.json(risk);
  } catch (error) {
    return NextResponse.json({ error: "Internal Server Error" }, { status: 500 });
  }
}
