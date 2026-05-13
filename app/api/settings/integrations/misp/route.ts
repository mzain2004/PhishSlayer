import { NextRequest, NextResponse } from "next/server";
import { auth } from "@clerk/nextjs/server";
import { supabaseAdmin } from "@/lib/supabase/admin";
import { apiSuccess, apiError, API_CODES } from "@/lib/api/response";
import { z } from "zod";
import { requireRole } from "@/lib/security/rbac";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

const mispSchema = z
  .object({
    misp_url: z.string().url(),
    misp_api_key: z.string().min(10),
    misp_ssl: z.boolean().default(true),
  })
  .strict();

export async function GET() {
  const { orgId } = await auth();
  if (!orgId) return apiError(API_CODES.UNAUTHORIZED, "Unauthorized", 401);

  const { data, error } = await supabaseAdmin
    .from("integrations")
    .select("id, provider, status, created_at, updated_at")
    .eq("organization_id", orgId)
    .eq("provider", "misp")
    .maybeSingle();

  if (error)
    return apiError(
      API_CODES.INTERNAL_ERROR,
      "Failed to fetch MISP config",
      500,
    );

  return apiSuccess({ connected: !!data, integration: data ?? null });
}

export async function POST(req: NextRequest) {
  const guard = await requireRole(["org:owner", "org:admin"]);
  if (!guard.ok) return guard.response;

  const { orgId, userId } = guard;

  let body: unknown;
  try {
    body = await req.json();
  } catch {
    return apiError(API_CODES.VALIDATION_ERROR, "Invalid JSON", 400);
  }

  const parsed = mispSchema.safeParse(body);
  if (!parsed.success) {
    return apiError(API_CODES.VALIDATION_ERROR, "Invalid input", 400);
  }

  const { misp_url, misp_api_key, misp_ssl } = parsed.data;

  const { error } = await supabaseAdmin.from("integrations").upsert(
    {
      organization_id: orgId,
      provider: "misp",
      status: "active",
      config: { misp_url, misp_ssl },
      credentials: { misp_api_key },
      updated_at: new Date().toISOString(),
    },
    { onConflict: "organization_id,provider" },
  );

  if (error)
    return apiError(
      API_CODES.INTERNAL_ERROR,
      "Failed to save MISP config",
      500,
    );

  return apiSuccess({ message: "MISP integration saved" });
}

export async function DELETE() {
  const guard = await requireRole(["org:owner", "org:admin"]);
  if (!guard.ok) return guard.response;

  const { orgId } = guard;

  const { error } = await supabaseAdmin
    .from("integrations")
    .delete()
    .eq("organization_id", orgId)
    .eq("provider", "misp");

  if (error)
    return apiError(
      API_CODES.INTERNAL_ERROR,
      "Failed to remove MISP config",
      500,
    );

  return apiSuccess({ message: "MISP integration removed" });
}
