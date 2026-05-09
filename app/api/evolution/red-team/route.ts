import { NextRequest, NextResponse } from "next/server";
import { auth } from "@clerk/nextjs/server";
import { z } from "zod";
import { createClient } from "@/lib/supabase/server";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

const TriggerSchema = z.object({
  suite: z.enum(["l1", "l2"]),
});

export async function GET(request: NextRequest) {
  const { userId, orgId } = await auth();
  if (!userId || !orgId) {
    return NextResponse.json({ error: "UNAUTHORIZED" }, { status: 401 });
  }

  const supabase = await createClient();

  // Admin-only: check org admin role via Clerk org membership
  const { data: findings, error } = await supabase
    .from("decepticon_findings")
    .select("id, suite, scenario_name, severity, description, exploited, recommendation, environment, created_at")
    .eq("organization_id", orgId)
    .order("created_at", { ascending: false })
    .limit(50);

  if (error) {
    return NextResponse.json({ error: "FETCH_FAILED" }, { status: 500 });
  }

  // Never expose raw attack payloads — return sanitized summary only
  return NextResponse.json({ findings: findings ?? [] });
}

export async function POST(request: NextRequest) {
  const { userId, orgId } = await auth();
  if (!userId || !orgId) {
    return NextResponse.json({ error: "UNAUTHORIZED" }, { status: 401 });
  }

  let body: z.infer<typeof TriggerSchema>;
  try {
    body = TriggerSchema.parse(await request.json());
  } catch {
    return NextResponse.json({ error: "INVALID_REQUEST" }, { status: 400 });
  }

  const agentServiceUrl = process.env.PYTHON_API_URL ?? "http://localhost:8000";
  const testEnv = process.env.NODE_ENV;

  if (testEnv === "production") {
    return NextResponse.json({ error: "RED_TEAM_NOT_ALLOWED_IN_PROD" }, { status: 403 });
  }

  try {
    const resp = await fetch(`${agentServiceUrl}/evolution/red-team`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ suite: body.suite, org_id: orgId }),
      signal: AbortSignal.timeout(60_000),
    });

    if (!resp.ok) {
      return NextResponse.json({ error: "RED_TEAM_FAILED" }, { status: 502 });
    }

    const data = await resp.json();
    return NextResponse.json({
      status: "triggered",
      suite: body.suite,
      total_scenarios: data.total_scenarios ?? 0,
      exploited_count: data.exploited_count ?? 0,
    });
  } catch {
    return NextResponse.json({ error: "AGENT_UNAVAILABLE" }, { status: 503 });
  }
}
