import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

const L2ResponseSchema = z.object({
  success: z.boolean(),
  processed: z.number().int().nonnegative().optional(),
  hitl_mode: z.boolean().optional(),
  results: z
    .array(
      z.object({
        escalation_id: z.string(),
        function_called: z.enum([
          "isolate_identity",
          "block_ip",
          "escalate_for_review",
        ]),
        args: z.record(z.string(), z.unknown()),
        action_fired: z.boolean(),
      }),
    )
    .optional(),
  error: z.string().optional(),
});

function isAuthorized(request: NextRequest): boolean {
  return (
    Boolean(process.env.CRON_SECRET) &&
    request.headers.get("authorization") === `Bearer ${process.env.CRON_SECRET}`
  );
}

export async function GET(request: NextRequest) {
  if (!isAuthorized(request)) {
    return NextResponse.json(
      { success: false, error: "Unauthorized" },
      { status: 401 },
    );
  }

  const response = await fetch(`${request.nextUrl.origin}/api/agent/respond`, {
    method: "GET",
    headers: {
      Authorization: `Bearer ${process.env.CRON_SECRET}`,
    },
  });

  const payload = await response.json();
  const parsed = L2ResponseSchema.safeParse(payload);
  if (!parsed.success) {
    return NextResponse.json(
      { success: false, error: "Invalid L2 response payload" },
      { status: 502 },
    );
  }

  return NextResponse.json(parsed.data, { status: response.status });
}