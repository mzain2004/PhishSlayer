import { NextResponse } from "next/server";
import { z } from "zod";
import { auth } from "@clerk/nextjs/server";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

const PYTHON_API_URL = z
  .string()
  .url()
  .parse(process.env.PYTHON_API_URL ?? "http://localhost:8000");

const ForwardBodySchema = z.record(z.string(), z.unknown());

export async function POST(request: Request) {
  const { userId, orgId } = await auth();
  if (!userId || !orgId) {
    return NextResponse.json({ error: "UNAUTHORIZED" }, { status: 401 });
  }

  let rawBody: unknown;

  try {
    rawBody = await request.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON body" }, { status: 400 });
  }

  const parsedBody = ForwardBodySchema.safeParse(rawBody);
  if (!parsedBody.success) {
    return NextResponse.json(
      {
        error: "Invalid request body",
        issues: parsedBody.error.issues,
      },
      { status: 400 },
    );
  }

  try {
    const upstreamResponse = await fetch(`${PYTHON_API_URL}/api/soc/l1`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify(parsedBody.data),
      cache: "no-store",
    });

    return new Response(upstreamResponse.body, {
      status: upstreamResponse.status,
      headers: upstreamResponse.headers,
    });
  } catch {
    return NextResponse.json(
      { error: "Failed to reach Python backend" },
      { status: 502 },
    );
  }
}
