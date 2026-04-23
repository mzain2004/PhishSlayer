import { NextResponse } from "next/server";
import { z } from "zod";
import { createClient } from "@/lib/supabase/server";
import { IngestionPipeline } from "@/lib/ingestion/pipeline";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

const schema = z.object({
  entries: z.array(z.object({
    raw_content: z.string().min(1),
    source_type: z.string().min(1),
    source_ip: z.string().optional().nullable()
  })).max(1000),
  org_id: z.string().min(1)
});

export async function POST(req: Request) {
  const apiKey = req.headers.get("x-api-key");
  if (apiKey !== process.env.INGEST_API_KEY) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    const body = await req.json();
    const { entries, org_id } = schema.parse(body);

    const supabase = await createClient();
    const pipeline = new IngestionPipeline(supabase);
    const stats = await pipeline.ingestBatch(entries, org_id);

    return NextResponse.json(stats);
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json({ error: "Validation failed", details: error.issues }, { status: 400 });
    }
    return NextResponse.json({ error: "Internal Server Error" }, { status: 500 });
  }
}
