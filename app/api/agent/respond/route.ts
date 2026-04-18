import { NextRequest, NextResponse } from "next/server";
import { createClient as createServerSupabaseClient } from "@/lib/supabase/server";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

function isCronAuthorized(request: NextRequest): boolean {
  const cronSecret = process.env.CRON_SECRET;
  if (!cronSecret) {
    return false;
  }

  return request.headers.get("authorization") === `Bearer ${cronSecret}`;
}

function isInternalAgentAuthorized(request: NextRequest): boolean {
  const secret = process.env.AGENT_SECRET;
  if (!secret) {
    return false;
  }

  return request.headers.get("AGENT_SECRET") === secret;
}

async function hasPrivilegedRole(): Promise<boolean> {
  const supabase = await createServerSupabaseClient();
  const {
    data: { user },
    error: authError,
  } = await supabase.auth.getUser();

  if (authError || !user) {
    return false;
  }

  const { data: profile, error: profileError } = await supabase
    .from("profiles")
    .select("role")
    .eq("id", user.id)
    .single();

  if (profileError || !profile) {
    return false;
  }

  return ["admin", "manager", "super_admin"].includes(profile.role);
}

async function runUnifiedL2Responder(
  request: NextRequest,
  mode: "sweep" | "manual",
) {
  const cronSecret = process.env.CRON_SECRET;
  if (!cronSecret) {
    return NextResponse.json(
      { success: false, error: "Missing CRON_SECRET" },
      { status: 500 },
    );
  }

  const baseUrl = process.env.INTERNAL_API_URL ?? request.nextUrl.origin;
  const response =
    mode === "manual"
      ? await fetch(`${baseUrl}/api/cron/l2-respond`, {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${cronSecret}`,
            AGENT_SECRET: process.env.AGENT_SECRET || "",
          },
          body: JSON.stringify({ min_age_minutes: 0 }),
          cache: "no-store",
        })
      : await fetch(`${baseUrl}/api/cron/l2-respond`, {
          method: "GET",
          headers: {
            Authorization: `Bearer ${cronSecret}`,
          },
          cache: "no-store",
        });

  let payload: unknown;
  try {
    payload = await response.json();
  } catch {
    payload = { success: false, error: "Invalid L2 responder payload" };
  }

  return NextResponse.json(payload, { status: response.status });
}

export async function GET(request: NextRequest) {
  if (!isCronAuthorized(request)) {
    return NextResponse.json(
      { success: false, error: "Unauthorized" },
      { status: 401 },
    );
  }

  return runUnifiedL2Responder(request, "sweep");
}

export async function POST(request: NextRequest) {
  const allowed =
    isInternalAgentAuthorized(request) || (await hasPrivilegedRole());
  if (!allowed) {
    return NextResponse.json(
      { success: false, error: "Forbidden: insufficient privileges" },
      { status: 403 },
    );
  }

  return runUnifiedL2Responder(request, "manual");
}
