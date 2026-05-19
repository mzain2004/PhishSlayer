import { NextRequest, NextResponse } from "next/server";
import { auth } from "@clerk/nextjs/server";
import { z } from "zod";
import { IocModel, storeIOCs } from "@/lib/tip/iocStore";
import { connectMongo } from "@/lib/mongodb";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

const PostSchema = z
  .object({
    value: z.string().trim().min(1),
    iocType: z.string().trim().min(1),
    confidence: z.number().min(0).max(100).optional(),
    tags: z.array(z.string()).optional(),
    source: z.string().trim().min(1).optional(),
  })
  .strict();

export async function GET(req: NextRequest) {
  const { userId, orgId } = await auth();
  if (!userId || !orgId) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    const { searchParams } = new URL(req.url);
    const type = searchParams.get("type");
    const confidence = searchParams.get("confidence");

    await connectMongo();
    // Return the requesting org's private IOCs PLUS the shared global feed
    // (org_id == null). Never returns another org's private indicators.
    let query = IocModel.find({
      $or: [{ org_id: null }, { org_id: orgId }],
    });
    if (type) query = query.where("type").equals(type);
    if (confidence) query = query.where("confidence").gte(parseInt(confidence));

    const iocs = await query.sort("-lastSeen").limit(100);
    return NextResponse.json(iocs);
  } catch (err) {
    console.error("[tip/iocs:GET]", err);
    return NextResponse.json(
      { error: "Internal Server Error" },
      { status: 500 },
    );
  }
}

export async function POST(req: NextRequest) {
  const { userId, orgId } = await auth();
  if (!userId || !orgId) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    const body = await req.json();
    const parsed = PostSchema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json({ error: "Invalid input" }, { status: 400 });
    }

    const payload = parsed.data;
    await storeIOCs(
      [
        {
          value: payload.value,
          iocType: payload.iocType,
          confidence: payload.confidence ?? 50,
          tags: payload.tags ?? [],
          source: payload.source ?? "manual",
        } as any,
      ],
      { orgId },
    );
    return NextResponse.json({ success: true });
  } catch (err) {
    console.error("[tip/iocs:POST]", err);
    return NextResponse.json(
      { error: "Internal Server Error" },
      { status: 500 },
    );
  }
}
