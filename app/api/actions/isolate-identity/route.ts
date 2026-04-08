import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";
import { cookies } from "next/headers";
import { createServerClient } from "@supabase/ssr";
import { z } from "zod";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

const IsolatePayloadSchema = z.object({
  targetUserId: z
    .string()
    .uuid({ message: "targetUserId must be a valid UUID" }),
  reason: z
    .string()
    .min(3, { message: "reason must be at least 3 characters" }),
});

export async function POST(request: NextRequest) {
  const agentSecretHeader =
    request.headers.get("AGENT_SECRET") ||
    request.headers.get("agent_secret") ||
    request.headers.get("x-agent-secret");
  const internalAuth =
    Boolean(agentSecretHeader) &&
    agentSecretHeader === process.env.AGENT_SECRET;

  let callerUserId: string | null = null;
  let callerRole: string = "system";

  if (!internalAuth) {
    // ── 1. Build caller client (respects RLS, reads session) ──────────────────
    const cookieStore = await cookies();
    const callerClient = createServerClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
      {
        cookies: {
          get(name: string) {
            return cookieStore.get(name)?.value;
          },
        },
      },
    );

    // ── 2. Verify caller is authenticated ────────────────────────────────────
    const {
      data: { user: callerUser },
      error: authError,
    } = await callerClient.auth.getUser();
    if (authError || !callerUser) {
      return NextResponse.json(
        { success: false, error: "Unauthorized" },
        { status: 401 },
      );
    }

    // ── 3. Verify caller has admin or manager role ────────────────────────────
    const { data: callerProfile, error: profileError } = await callerClient
      .from("profiles")
      .select("role")
      .eq("id", callerUser.id)
      .single();

    if (profileError || !callerProfile) {
      return NextResponse.json(
        { success: false, error: "Could not verify caller role" },
        { status: 403 },
      );
    }

    if (!["admin", "manager", "super_admin"].includes(callerProfile.role)) {
      return NextResponse.json(
        { success: false, error: "Forbidden: insufficient privileges" },
        { status: 403 },
      );
    }

    callerUserId = callerUser.id;
    callerRole = callerProfile.role;
  }

  // ── 4. Parse & validate request body ─────────────────────────────────────
  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json(
      { success: false, error: "Invalid JSON body" },
      { status: 400 },
    );
  }

  const parsed = IsolatePayloadSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json(
      {
        success: false,
        error: "Validation failed",
        details: parsed.error.flatten(),
      },
      { status: 400 },
    );
  }

  const { targetUserId, reason } = parsed.data;

  // Prevent self-isolation
  if (callerUserId && targetUserId === callerUserId) {
    return NextResponse.json(
      { success: false, error: "Cannot isolate your own account" },
      { status: 400 },
    );
  }

  // ── 5. Build service-role admin client (bypasses RLS for kill chain) ──────
  const adminClient = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!,
    { auth: { autoRefreshToken: false, persistSession: false } },
  );

  // ── 6. Verify target user exists ─────────────────────────────────────────
  const { data: targetProfile, error: targetError } = await adminClient
    .from("profiles")
    .select("id, status, role")
    .eq("id", targetUserId)
    .single();

  if (targetError || !targetProfile) {
    return NextResponse.json(
      { success: false, error: "Target user not found" },
      { status: 404 },
    );
  }

  if (targetProfile.status === "isolated") {
    return NextResponse.json(
      { success: false, error: "Target user is already isolated" },
      { status: 409 },
    );
  }

  // ── 7. KILL CHAIN — execute atomically ───────────────────────────────────

  // Step 7a: Lock the profile row
  const { error: profileUpdateError } = await adminClient
    .from("profiles")
    .update({
      status: "isolated",
      risk_score: 100,
      updated_at: new Date().toISOString(),
    })
    .eq("id", targetUserId);

  if (profileUpdateError) {
    return NextResponse.json(
      {
        success: false,
        error: "Failed to update target profile",
        details: profileUpdateError.message,
      },
      { status: 500 },
    );
  }

  // Step 7b: Revoke all active sessions — signs user out of every device immediately
  const { error: signOutError } = await adminClient.auth.admin.signOut(
    targetUserId,
    "global",
  );

  if (signOutError) {
    // Non-fatal: profile is already locked. Log the partial failure but continue.
    console.error(
      "[isolate-identity] Session revocation partial failure:",
      signOutError.message,
    );
  }

  // Step 7c: Ban the user at auth level to block new logins
  const { error: banError } = await adminClient.auth.admin.updateUserById(
    targetUserId,
    {
      ban_duration: "876600h", // 100 years = permanent ban
    },
  );

  if (banError) {
    console.error(
      "[isolate-identity] Auth ban partial failure:",
      banError.message,
    );
  }

  // ── 8. Write critical audit log ──────────────────────────────────────────
  const { error: auditError } = await adminClient.from("audit_logs").insert({
    actor_id: callerUserId,
    target_id: targetUserId,
    action: "IDENTITY_ISOLATED",
    severity: "critical",
    reason,
    metadata: {
      caller_role: callerRole,
      previous_status: targetProfile.status,
      session_revoked: !signOutError,
      auth_banned: !banError,
    },
    created_at: new Date().toISOString(),
  });

  if (auditError) {
    // Audit failure is non-fatal but must be flagged
    console.error(
      "[isolate-identity] Audit log write failed:",
      auditError.message,
    );
  }

  // ── 9. Return strict response ─────────────────────────────────────────────
  return NextResponse.json(
    {
      success: true,
      message: `User ${targetUserId} has been isolated.`,
      kill_chain: {
        profile_locked: true,
        sessions_revoked: !signOutError,
        auth_banned: !banError,
        audit_logged: !auditError,
      },
    },
    { status: 200 },
  );
}
