import { NextResponse } from "next/server";
import { auth } from "@clerk/nextjs/server";
import { createClient } from "@/lib/supabase/server";
import { disableAccount } from "@/lib/l2/containment";
import { z } from "zod";

export const dynamic = 'force-dynamic';
export const runtime = 'nodejs';

const schema = z.object({
  userId: z.string().min(1),
  reason: z.string().min(5),
  organizationId: z.string().uuid()
}).strict();

export async function POST(req: Request) {
  const { userId: authId } = await auth();
  if (!authId) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  try {
    const body = await req.json();
    const { userId, reason, organizationId } = schema.parse(body);

    const supabase = await createClient();
    const result = await disableAccount(supabase, userId, organizationId, authId, reason);

    return NextResponse.json(result);
  } catch (error) {
    if (error instanceof z.ZodError) return NextResponse.json({ error: error.issues }, { status: 400 });
    return NextResponse.json({ error: "Internal Server Error" }, { status: 500 });
  }
}
