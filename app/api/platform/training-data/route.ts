import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";
import { z } from "zod";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

const QuerySchema = z.object({
  summary: z
    .string()
    .optional()
    .transform((value) => value === "1" || value === "true"),
});

const AgentLevelSchema = z.enum(["L1", "L2", "L3"]);

const ReasoningRowSchema = z.object({
  alert_id: z.string().uuid().nullable().optional(),
  escalation_id: z.string().uuid().nullable().optional(),
  agent_level: AgentLevelSchema,
  decision: z.string().min(1),
  confidence_score: z.number().min(0).max(1).nullable().optional(),
  reasoning_text: z.string().min(1),
  iocs_considered: z.array(z.unknown()).nullable().optional(),
  actions_taken: z.array(z.unknown()).nullable().optional(),
  created_at: z.string().datetime(),
});

type ReasoningRow = z.infer<typeof ReasoningRowSchema>;

function getAdminClient() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY;

  if (!url || !key) {
    throw new Error(
      "Missing NEXT_PUBLIC_SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY",
    );
  }

  return createClient(url, key, {
    auth: { autoRefreshToken: false, persistSession: false },
  });
}

function isAuthorized(request: NextRequest): boolean {
  const cronHeader =
    request.headers.get("cron_secret") ||
    request.headers.get("cron-secret") ||
    request.headers.get("x-cron-secret");
  const auth = request.headers.get("authorization");
  const expected = process.env.CRON_SECRET;

  if (!expected) {
    return false;
  }

  return cronHeader === expected || auth === `Bearer ${expected}`;
}

function buildPrompt(row: ReasoningRow): string {
  const context = {
    alert_id: row.alert_id || null,
    escalation_id: row.escalation_id || null,
    decision: row.decision,
    iocs_considered: row.iocs_considered || [],
    actions_taken: row.actions_taken || [],
  };

  return `Agent Level: ${row.agent_level}\nDecision Context:\n${JSON.stringify(context, null, 2)}`;
}

function buildCompletion(row: ReasoningRow): string {
  return `Decision: ${row.decision}\nReasoning: ${row.reasoning_text}`;
}

export async function GET(request: NextRequest) {
  if (!isAuthorized(request)) {
    return NextResponse.json(
      { success: false, error: "Unauthorized" },
      { status: 401 },
    );
  }

  const query = QuerySchema.safeParse({
    summary: request.nextUrl.searchParams.get("summary") || undefined,
  });

  if (!query.success) {
    return NextResponse.json(
      { success: false, error: "Invalid query parameters" },
      { status: 400 },
    );
  }

  const adminClient = getAdminClient();

  const { data, error } = await adminClient
    .from("agent_reasoning")
    .select(
      "alert_id, escalation_id, agent_level, decision, confidence_score, reasoning_text, iocs_considered, actions_taken, created_at",
    )
    .not("reasoning_text", "is", null)
    .order("created_at", { ascending: true });

  if (error) {
    return NextResponse.json(
      {
        success: false,
        error: `Failed to fetch training data: ${error.message}`,
      },
      { status: 500 },
    );
  }

  const rows: ReasoningRow[] = [];
  for (const row of data || []) {
    const parsed = ReasoningRowSchema.safeParse(row);
    if (parsed.success) {
      rows.push(parsed.data);
    }
  }

  const byAgentLevel = {
    L1: rows.filter((row) => row.agent_level === "L1").length,
    L2: rows.filter((row) => row.agent_level === "L2").length,
    L3: rows.filter((row) => row.agent_level === "L3").length,
  };

  const summary = {
    total_records: rows.length,
    by_agent_level: byAgentLevel,
    date_range: {
      start: rows[0]?.created_at || null,
      end: rows[rows.length - 1]?.created_at || null,
    },
  };

  if (query.data.summary) {
    return NextResponse.json(summary);
  }

  const jsonl = rows
    .map((row) =>
      JSON.stringify({
        prompt: buildPrompt(row),
        completion: buildCompletion(row),
        agent_level: row.agent_level,
        confidence: row.confidence_score ?? 0,
      }),
    )
    .join("\n");

  const filename = `training-data-${new Date().toISOString().slice(0, 10)}.jsonl`;

  return new NextResponse(jsonl, {
    status: 200,
    headers: {
      "Content-Type": "application/x-ndjson; charset=utf-8",
      "Content-Disposition": `attachment; filename=\"${filename}\"`,
      "X-Training-Summary": JSON.stringify(summary),
      "Cache-Control": "no-store",
    },
  });
}
