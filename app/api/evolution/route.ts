import { NextRequest, NextResponse } from "next/server";
import { auth } from "@clerk/nextjs/server";
import { z } from "zod";
import { createClient } from "@/lib/supabase/server";
import { logger } from "@/lib/logger";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

const ApproveSchema = z.object({
  proposalId: z.string().uuid(),
  action: z.enum(["approve", "reject"]),
}).strict();

export async function GET(request: NextRequest) {
  const requestId = request.headers.get("x-request-id") ?? crypto.randomUUID();
  const start = Date.now();
  const route = "/api/evolution";

  const { userId, orgId } = await auth();
  if (!userId || !orgId) {
    logger.warn("auth_failed", { route, request_id: requestId, user_id: null, org_id: null, error_code: "UNAUTHORIZED" });
    return NextResponse.json({ error: "UNAUTHORIZED" }, { status: 401 });
  }

  logger.info("request_start", { route, request_id: requestId, user_id: userId, org_id: orgId });

  const supabase = await createClient();

  const { data, error } = await supabase
    .from("agent_evolution")
    .select("*")
    .eq("organization_id", orgId)
    .order("created_at", { ascending: false })
    .limit(100);

  if (error) {
    logger.error("request_failed", { route, request_id: requestId, user_id: userId, org_id: orgId, duration_ms: Date.now() - start, error_code: "FETCH_FAILED" });
    return NextResponse.json({ error: "FETCH_FAILED" }, { status: 500 });
  }

  logger.info("request_complete", { route, request_id: requestId, user_id: userId, org_id: orgId, duration_ms: Date.now() - start });
  return NextResponse.json({ proposals: data ?? [] });
}

export async function POST(request: NextRequest) {
  const requestId = request.headers.get("x-request-id") ?? crypto.randomUUID();
  const start = Date.now();
  const route = "/api/evolution";

  const { userId, orgId } = await auth();
  if (!userId || !orgId) {
    logger.warn("auth_failed", { route, request_id: requestId, user_id: null, org_id: null, error_code: "UNAUTHORIZED" });
    return NextResponse.json({ error: "UNAUTHORIZED" }, { status: 401 });
  }

  logger.info("request_start", { route, request_id: requestId, user_id: userId, org_id: orgId });

  let body: z.infer<typeof ApproveSchema>;
  try {
    body = ApproveSchema.parse(await request.json());
  } catch {
    logger.warn("validation_failed", { route, request_id: requestId, user_id: userId, org_id: orgId, error_code: "INVALID_REQUEST" });
    return NextResponse.json({ error: "INVALID_REQUEST" }, { status: 400 });
  }

  const supabase = await createClient();

  const { data: proposal, error: fetchErr } = await supabase
    .from("agent_evolution")
    .select("id, organization_id")
    .eq("id", body.proposalId)
    .eq("organization_id", orgId)
    .single();

  if (fetchErr || !proposal) {
    logger.warn("validation_failed", { route, request_id: requestId, user_id: userId, org_id: orgId, error_code: "PROPOSAL_NOT_FOUND" });
    return NextResponse.json({ error: "PROPOSAL_NOT_FOUND" }, { status: 404 });
  }

  const { error: updateErr } = await supabase
    .from("agent_evolution")
    .update({
      applied: body.action === "approve",
      applied_at: new Date().toISOString(),
      applied_by: userId,
    })
    .eq("id", body.proposalId)
    .eq("organization_id", orgId);

  if (updateErr) {
    logger.error("request_failed", { route, request_id: requestId, user_id: userId, org_id: orgId, duration_ms: Date.now() - start, error_code: "UPDATE_FAILED" });
    return NextResponse.json({ error: "UPDATE_FAILED" }, { status: 500 });
  }

  logger.info("request_complete", { route, request_id: requestId, user_id: userId, org_id: orgId, duration_ms: Date.now() - start, metadata: { action: body.action } });
  return NextResponse.json({ status: body.action === "approve" ? "approved" : "rejected" });
}
