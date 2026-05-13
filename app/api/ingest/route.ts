import { NextResponse } from "next/server";
import { z } from "zod";
import { createClient } from "@/lib/supabase/server";
import { IngestionPipeline } from "@/lib/ingestion/pipeline";
import { logAudit } from "@/lib/compliance/audit-logger";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

const schema = z.object({
  raw_content: z.string().min(1),
  source_type: z.string().min(1),
  organization_id: z.string().min(1),
  source_ip: z.string().optional().nullable()
}).strict();

import { auth } from '@clerk/nextjs/server';

export async function POST(req: Request) {
  const { userId } = await auth();
  const apiKey = req.headers.get("x-api-key");
  const isApiAuthorized =
    process.env.INGEST_API_KEY && apiKey === process.env.INGEST_API_KEY;

  if (!userId && !isApiAuthorized) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    const body = await req.json();
    const { raw_content, source_type, organization_id, source_ip } = schema.parse(body);

    const supabase = await createClient();
    const pipeline = new IngestionPipeline(supabase);
    // Generic ingest endpoint doesn't always have connector ID, use zero-uuid
    const connectorId = '00000000-0000-0000-0000-000000000000';
    const result = await pipeline.ingestEvent(raw_content, connectorId, organization_id, source_type);

    void logAudit(organization_id, {
        actor_type: userId ? 'USER' : 'SYSTEM',
        actor_id: userId || 'INGEST_API',
        action: 'DATA_INGESTED',
        resource_type: 'INGEST_EVENT',
        resource_id: result.id,
        metadata: { source_type, source_ip }
    });

    return NextResponse.json(result);
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json({ error: "Validation failed", details: error.issues }, { status: 400 });
    }
    return NextResponse.json({ error: "Internal Server Error" }, { status: 500 });
  }
}
