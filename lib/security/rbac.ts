/**
 * Role-Based Access Control helpers.
 *
 * Roles come from Clerk organization memberships. Clerk represents them as
 * "org:owner", "org:admin", "org:member" (and any custom roles you define).
 *
 * Usage in a route handler:
 *
 *   const guard = await requireRole(["org:owner", "org:admin"]);
 *   if (!guard.ok) return guard.response;
 *   const { userId, orgId, role } = guard;
 *
 * The destructive-action allowlist (DELETE, member invite/remove, integration
 * connect/disconnect, billing changes) should always go through requireRole;
 * read-only routes only need requireAuth.
 */

import { NextResponse } from "next/server";
import { auth, clerkClient } from "@clerk/nextjs/server";

export type AuthGuardOk = {
  ok: true;
  userId: string;
  orgId: string;
};

export type AuthGuardFail = {
  ok: false;
  response: NextResponse;
};

export async function requireAuth(): Promise<AuthGuardOk | AuthGuardFail> {
  const { userId, orgId } = await auth();
  if (!userId || !orgId) {
    return {
      ok: false,
      response: NextResponse.json(
        { error: "Unauthorized" },
        { status: 401 },
      ),
    };
  }
  return { ok: true, userId, orgId };
}

export type RoleGuardOk = AuthGuardOk & { role: string };
export type RoleGuard = RoleGuardOk | AuthGuardFail;

const DEFAULT_ADMIN_ROLES = ["org:owner", "org:admin"] as const;

export async function requireRole(
  allowed: readonly string[] = DEFAULT_ADMIN_ROLES,
): Promise<RoleGuard> {
  const base = await requireAuth();
  if (!base.ok) return base;

  try {
    const client = await clerkClient();
    const memberships =
      await client.users.getOrganizationMembershipList({ userId: base.userId });
    const m = memberships.data.find(
      (mem) => mem.organization.id === base.orgId,
    );
    if (!m) {
      return {
        ok: false,
        response: NextResponse.json(
          { error: "Forbidden" },
          { status: 403 },
        ),
      };
    }
    if (!allowed.includes(m.role)) {
      return {
        ok: false,
        response: NextResponse.json(
          { error: "Forbidden" },
          { status: 403 },
        ),
      };
    }
    return { ok: true, userId: base.userId, orgId: base.orgId, role: m.role };
  } catch (err) {
    console.error("[rbac] role lookup failed", err);
    return {
      ok: false,
      response: NextResponse.json(
        { error: "Forbidden" },
        { status: 403 },
      ),
    };
  }
}
