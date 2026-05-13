import { NextResponse } from "next/server";
import { auth } from "@clerk/nextjs/server";
import { createClient } from "@/lib/supabase/server";
import { blockIP } from "@/lib/l2/containment";
import { z } from "zod";

export const dynamic = 'force-dynamic';
export const runtime = 'nodejs';

const schema = z.object({
  ip: z.string(),
  alertId: z.string().uuid().optional(),
  reason: z.string().min(5),
  organizationId: z.string().uuid()
}).strict();

export async function POST(req: Request) {
  const { userId } = await auth();
  if (!userId) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  try {
    const body = await req.json();
    const { ip, alertId, reason, organizationId } = schema.parse(body);

    const supabase = await createClient();
    const result = await blockIP(supabase, ip, organizationId, userId, reason, alertId);

    return NextResponse.json(result);
  } catch (error) {
    if (error instanceof z.ZodError) return NextResponse.json({ error: error.issues }, { status: 400 });
    return NextResponse.json({ error: "Internal Server Error" }, { status: 500 });
  }
}
