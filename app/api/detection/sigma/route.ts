import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";
import { z } from "zod";
import { generateWithGemini } from "@/lib/sigma-generator";
import { createClient as createServerClient } from "@/lib/supabase/server";
import { checkTierAccess } from "@/lib/tier-guard";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

const PostSchema = z.object({
  alert_id: z.string().uuid(),
  analysis_id: z.string().uuid().optional(),
});

const QuerySchema = z.object({
  page: z.coerce.number().int().min(1).default(1),
  limit: z.coerce.number().int().min(1).max(100).default(20),
  rule_level: z
    .enum(["informational", "low", "medium", "high", "critical"])
    .optional(),
  rule_status: z
    .enum(["stable", "test", "experimental", "deprecated"])
    .optional(),
});

function getAdminClient() {
  return createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!,
    { auth: { autoRefreshToken: false, persistSession: false } },
  );
}

export async function POST(request: NextRequest) {
  try {
    const authHeader = request.headers.get("authorization");
    const isCronRequest =
      Boolean(process.env.CRON_SECRET) &&
      authHeader === `Bearer ${process.env.CRON_SECRET}`;

    if (!isCronRequest) {
      const supabase = await createServerClient();
      const {
        data: { user },
      } = await supabase.auth.getUser();

      if (!user) {
        return NextResponse.json(
          { success: false, error: "Unauthorized" },
          { status: 401 },
        );
      }

      const access = await checkTierAccess(user.id, "sigma_rules");
      if (!access.allowed) {
        return NextResponse.json(
          {
            success: false,
            error: "Upgrade required",
            required_tier: "pro",
            current_tier: access.tier,
          },
          { status: 403 },
        );
      }
    }

    const payload = await request.json();
    const parsed = PostSchema.safeParse(payload);

    if (!parsed.success) {
      return NextResponse.json(
        {
          success: false,
          error: "Invalid payload",
          details: parsed.error.flatten(),
        },
        { status: 400 },
      );
    }

    const { alert_id, analysis_id } = parsed.data;
    const adminClient = getAdminClient();

    const { data: alert, error: alertError } = await adminClient
      .from("alerts")
      .select("*")
      .eq("id", alert_id)
      .single();

    if (alertError || !alert) {
      return NextResponse.json(
        {
          success: false,
          error: `Alert not found: ${alertError?.message || "missing record"}`,
        },
        { status: 404 },
      );
    }

    let analysisData: Record<string, unknown> | undefined;
    if (analysis_id) {
      const { data: analysis, error: analysisError } = await adminClient
        .from("static_analysis")
        .select("*")
        .eq("id", analysis_id)
        .single();

      if (analysisError) {
        return NextResponse.json(
          {
            success: false,
            error: `Failed to fetch static analysis: ${analysisError.message}`,
          },
          { status: 400 },
        );
      }

      analysisData = (analysis || undefined) as
        | Record<string, unknown>
        | undefined;
    }

    const generatedRule = await generateWithGemini(
      alert as Record<string, unknown>,
      analysisData,
    );

    const { data: insertedRule, error: insertError } = await adminClient
      .from("sigma_rules")
      .insert({
        alert_id,
        analysis_id: analysis_id || null,
        rule_name: generatedRule.rule_name,
        rule_title: generatedRule.rule_title,
        rule_description:
          typeof alert.rule_description === "string"
            ? alert.rule_description
            : null,
        rule_status: "experimental",
        rule_level: generatedRule.rule_level,
        rule_yaml: generatedRule.rule_yaml,
        mitre_techniques: generatedRule.mitre_techniques,
        auto_deployed: false,
        deployment_target: "wazuh",
      })
      .select("*")
      .single();

    if (insertError || !insertedRule) {
      return NextResponse.json(
        {
          success: false,
          error: `Failed to save Sigma rule: ${insertError?.message || "insert failed"}`,
        },
        { status: 500 },
      );
    }

    await adminClient.from("agent_reasoning").insert({
      alert_id,
      agent_level: "L3",
      decision: "SIGMA_GENERATED",
      confidence_score: 0.91,
      reasoning_text:
        "Generated Sigma detection rule from alert and available static analysis context.",
      actions_taken: ["SIGMA_RULE_CREATED"],
      model_used: "ollama+gemini-fallback",
    });

    return NextResponse.json({
      success: true,
      rule: insertedRule,
    });
  } catch (error) {
    return NextResponse.json(
      {
        success: false,
        error:
          error instanceof Error
            ? error.message
            : "Failed to generate Sigma rule",
      },
      { status: 500 },
    );
  }
}

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const parsedQuery = QuerySchema.safeParse({
      page: searchParams.get("page") ?? "1",
      limit: searchParams.get("limit") ?? "20",
      rule_level: searchParams.get("rule_level") ?? undefined,
      rule_status: searchParams.get("rule_status") ?? undefined,
    });

    if (!parsedQuery.success) {
      return NextResponse.json(
        {
          success: false,
          error: "Invalid query parameters",
          details: parsedQuery.error.flatten(),
        },
        { status: 400 },
      );
    }

    const { page, limit, rule_level, rule_status } = parsedQuery.data;
    const from = (page - 1) * limit;
    const to = from + limit - 1;

    const adminClient = getAdminClient();
    let query = adminClient
      .from("sigma_rules")
      .select("*", { count: "exact" })
      .order("created_at", { ascending: false })
      .range(from, to);

    if (rule_level) {
      query = query.eq("rule_level", rule_level);
    }

    if (rule_status) {
      query = query.eq("rule_status", rule_status);
    }

    const { data, error, count } = await query;

    if (error) {
      return NextResponse.json(
        {
          success: false,
          error: `Failed to fetch Sigma rules: ${error.message}`,
        },
        { status: 500 },
      );
    }

    return NextResponse.json({
      success: true,
      data: data || [],
      count: count || 0,
      page,
      limit,
    });
  } catch (error) {
    return NextResponse.json(
      {
        success: false,
        error:
          error instanceof Error ? error.message : "Failed to list Sigma rules",
      },
      { status: 500 },
    );
  }
}
