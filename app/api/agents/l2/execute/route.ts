import { NextRequest, NextResponse } from "next/server";
import { auth } from "@clerk/nextjs/server";
import { z } from "zod";
import { createClient } from "@/lib/supabase/server";
import { logger } from "@/lib/logger";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

const ExecuteSchema = z.object({
  alertId: z.string().uuid(),
  actionId: z.string().min(1),
  approved: z.boolean(),
  approvedBy: z.string().min(1),
  rejectReason: z.string().optional(),
}).strict();

export async function POST(request: NextRequest) {
  const requestId = request.headers.get("x-request-id") ?? crypto.randomUUID();
  const start = Date.now();
  const route = "/api/agents/l2/execute";

  const { userId, orgId } = await auth();
  if (!userId || !orgId) {
    logger.warn("auth_failed", { route, request_id: requestId, user_id: null, org_id: null, error_code: "UNAUTHORIZED" });
    return NextResponse.json({ error: "UNAUTHORIZED" }, { status: 401 });
  }

  logger.info("request_start", { route, request_id: requestId, user_id: userId, org_id: orgId });

  let body: z.infer<typeof ExecuteSchema>;
  try {
    body = ExecuteSchema.parse(await request.json());
  } catch {
    logger.warn("validation_failed", { route, request_id: requestId, user_id: userId, org_id: orgId, error_code: "INVALID_REQUEST" });
    return NextResponse.json({ error: "INVALID_REQUEST" }, { status: 400 });
  }

  const supabase = await createClient();

  // Fetch the pending action and verify org scope
  const { data: pendingAction, error: fetchErr } = await supabase
    .from("pending_actions")
    .select("*")
    .eq("id", body.actionId)
    .eq("organization_id", orgId)
    .eq("status", "pending")
    .single();

  if (fetchErr || !pendingAction) {
    logger.warn("validation_failed", { route, request_id: requestId, user_id: userId, org_id: orgId, alert_id: body.alertId, error_code: "ACTION_NOT_FOUND" });
    return NextResponse.json({ error: "ACTION_NOT_FOUND" }, { status: 404 });
  }

  // Two-person rule for org/tenant blast radius
  const blastRadius = pendingAction.consequence_model?.blast_radius ?? "user";
  const requiresTwoPerson = ["org", "tenant"].includes(blastRadius);

  if (requiresTwoPerson) {
    const existingApprovals: string[] = pendingAction.approvals ?? [];
    if (existingApprovals.includes(userId)) {
      logger.warn("validation_failed", { route, request_id: requestId, user_id: userId, org_id: orgId, alert_id: body.alertId, error_code: "DUPLICATE_APPROVAL" });
      return NextResponse.json({ error: "DUPLICATE_APPROVAL" }, { status: 409 });
    }
    const newApprovals = [...existingApprovals, userId];

    if (newApprovals.length < (pendingAction.required_approvals ?? 2)) {
      // Record partial approval
      await supabase
        .from("pending_actions")
        .update({ approvals: newApprovals })
        .eq("id", body.actionId)
        .eq("organization_id", orgId);

      logger.info("request_complete", { route, request_id: requestId, user_id: userId, org_id: orgId, alert_id: body.alertId, duration_ms: Date.now() - start, metadata: { status: "partial_approval", approvals: newApprovals.length } });
      return NextResponse.json({
        status: "partial_approval",
        approvals: newApprovals.length,
        required: pendingAction.required_approvals ?? 2,
      });
    }
  }

  if (!body.approved) {
    await supabase
      .from("pending_actions")
      .update({
        status: "rejected",
        rejected_at: new Date().toISOString(),
        rejected_reason: body.rejectReason ?? null,
      })
      .eq("id", body.actionId)
      .eq("organization_id", orgId);

    logger.info("request_complete", { route, request_id: requestId, user_id: userId, org_id: orgId, alert_id: body.alertId, duration_ms: Date.now() - start, metadata: { status: "rejected" } });
    return NextResponse.json({ status: "rejected" });
  }

  // Forward execution to agent service
  const agentServiceUrl = process.env.PYTHON_API_URL ?? "http://localhost:8000";
  try {
    logger.info("agent_dispatched", { route, request_id: requestId, user_id: userId, org_id: orgId, alert_id: pendingAction.alert_id, agent_level: "L2" });

    const resp = await fetch(`${agentServiceUrl}/agents/l2/execute`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        action_id: body.actionId,
        alert_id: pendingAction.alert_id,
        org_id: orgId,
        approved_by: userId,
      }),
      signal: AbortSignal.timeout(20_000),
    });

    if (!resp.ok) {
      logger.error("request_failed", { route, request_id: requestId, user_id: userId, org_id: orgId, alert_id: pendingAction.alert_id, agent_level: "L2", duration_ms: Date.now() - start, error_code: "EXECUTION_FAILED" });
      return NextResponse.json({ error: "EXECUTION_FAILED" }, { status: 502 });
    }

    await supabase
      .from("pending_actions")
      .update({
        status: "approved",
        approved_at: new Date().toISOString(),
        approvals: requiresTwoPerson
          ? [...(pendingAction.approvals ?? []), userId]
          : [userId],
      })
      .eq("id", body.actionId)
      .eq("organization_id", orgId);

    logger.info("request_complete", { route, request_id: requestId, user_id: userId, org_id: orgId, alert_id: pendingAction.alert_id, agent_level: "L2", duration_ms: Date.now() - start });
    return NextResponse.json({ status: "approved_and_executed" });
  } catch {
    logger.error("request_failed", { route, request_id: requestId, user_id: userId, org_id: orgId, alert_id: pendingAction.alert_id, agent_level: "L2", duration_ms: Date.now() - start, error_code: "AGENT_UNAVAILABLE" });
    return NextResponse.json({ error: "AGENT_UNAVAILABLE" }, { status: 503 });
  }
}
