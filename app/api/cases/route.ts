import { NextResponse } from "next/server";
import { auth } from "@clerk/nextjs/server";
import { z } from "zod";
import { createClerkSupabaseClient } from "@/lib/supabase/clerk-client";
import { notifyExternalSystems } from "@/lib/connectors/index";
import { apiSuccess, apiError, apiPaginated, API_CODES } from "@/lib/api/response";
import { deliverWebhook } from "@/lib/webhooks/delivery";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

const createCaseSchema = z.object({
  title: z.string().min(1, "Title is required"),
  organization_id: z.string().min(1, "Organization ID is required"),
  severity: z.enum(["p1", "p2", "p3", "p4"]).optional().default("p3"),
  status: z.enum(["OPEN", "IN_PROGRESS", "CONTAINED", "REMEDIATED", "CLOSED", "ARCHIVED"]).optional().default("OPEN"),
  alert_type: z.string().optional(),
  source_ip: z.string().optional(),
  affected_asset: z.string().optional(),
  mitre_tactic: z.string().optional(),
  mitre_technique: z.string().optional(),
  sla_deadline: z.string().optional(),
});

export async function GET(req: Request) {
  const { userId } = await auth();
  if (!userId) return apiError(API_CODES.UNAUTHORIZED, "Unauthorized", 401);

  const { searchParams } = new URL(req.url);
  const orgId = searchParams.get('orgId');
  const status = searchParams.get('status');
  const page = Math.max(1, parseInt(searchParams.get('page') || '1'));
  const limit = Math.min(200, Math.max(1, parseInt(searchParams.get('limit') || '50')));
  const offset = (page - 1) * limit;

  if (!orgId) return apiError(API_CODES.VALIDATION_ERROR, "orgId is required", 400);

  const supabase = await createClerkSupabaseClient();
  
  let query = supabase
    .from("cases")
    .select("id, organization_id, title, status, severity, alert_type, affected_asset, created_at, closed_at, sla_deadline", { count: 'exact' })
    .eq("organization_id", orgId);

  if (status) {
    query = query.eq("status", status);
  }

  const { data, error, count } = await query
    .order("created_at", { ascending: false })
    .range(offset, offset + limit - 1);

  if (error) return apiError(API_CODES.INTERNAL_ERROR, "Internal server error", 500);
  
  return apiPaginated(data || [], count || 0, page, limit);
}

export async function POST(req: Request) {
  const { userId } = await auth();
  if (!userId) return apiError(API_CODES.UNAUTHORIZED, "Unauthorized", 401);

  try {
    const body = await req.json();
    const validatedData = createCaseSchema.parse(body);
    
    const supabase = await createClerkSupabaseClient();

    const { data, error } = await supabase
      .from("cases")
      .insert({
        ...validatedData,
        user_id: userId,
      })
      .select()
      .single();

    if (error) return apiError(API_CODES.INTERNAL_ERROR, "Internal server error", 500);

    // Initial timeline entry
    await supabase.from('case_timeline').insert({
        case_id: data.id,
        org_id: validatedData.organization_id,
        event_type: 'alert_triggered',
        actor: 'System',
        description: `Case created automatically for ${data.alert_type}`
    });

    void notifyExternalSystems(data.id, data.title, data.severity, `New case created: ${data.title}`, supabase);

    void deliverWebhook(validatedData.organization_id, 'case.created', data);

    return apiSuccess(data);
  } catch (error: any) {
    if (error instanceof z.ZodError) {
      return apiError(API_CODES.VALIDATION_ERROR, "Validation failed", 400, error.issues);
    }
    return apiError(API_CODES.INTERNAL_ERROR, "Internal server error", 500);
  }
}
