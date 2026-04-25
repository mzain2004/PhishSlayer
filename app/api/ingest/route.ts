import { NextResponse } from "next/server";
import { z } from "zod";
import { createClient } from "@/lib/supabase/server";
import { IngestionPipeline } from "@/lib/ingestion/pipeline";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

const schema = z.object({
  raw_content: z.string().min(1),
  source_type: z.string().min(1),
  organization_id: z.string().min(1),
  source_ip: z.string().optional().nullable()
});

export async function POST(req: Request) {
  const apiKey = req.headers.get("x-api-key");
  if (!process.env.INGEST_API_KEY) {
    console.error("CRITICAL ERROR: INGEST_API_KEY is not defined in environment variables.");
    return NextResponse.json({ error: "Internal Server Error" }, { status: 500 });
  }
  if (apiKey !== process.env.INGEST_API_KEY) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    const body = await req.json();
    const { raw_content, source_type, organization_id, source_ip } = schema.parse(body);

    const supabase = await createClient();
    const pipeline = new IngestionPipeline(supabase);
    const result = await pipeline.ingestLog(raw_content, source_type, organization_id, source_ip);

    return NextResponse.json(result);
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json({ error: "Validation failed", details: error.issues }, { status: 400 });
    }
    return NextResponse.json({ error: "Internal Server Error" }, { status: 500 });
  }
}
