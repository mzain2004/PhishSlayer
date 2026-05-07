import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { IngestionPipeline } from "@/lib/ingestion/pipeline";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

export async function POST(request: NextRequest) {
  const ingestKey =
    request.headers.get("x-api-key") ??
    request.headers.get("authorization")?.replace("Bearer ", "");

  if (!ingestKey || ingestKey !== process.env.INGEST_API_KEY) {
    return NextResponse.json({ error: "UNAUTHORIZED" }, { status: 401 });
  }

  const connectorId = request.nextUrl.searchParams.get("connector");
  const orgId = request.headers.get("x-org-id");

  if (!connectorId || !orgId) {
    return NextResponse.json({ error: "Missing routing params" }, { status: 400 });
  }

  try {
    const rawBody = await request.text();
    
    const supabase = await createClient();
    const pipeline = new IngestionPipeline(supabase);
    
    try {
      await pipeline.ingestEvent(rawBody, connectorId, orgId);
      return NextResponse.json({ success: true, message: "Accepted" }, { status: 200 });
    } catch (err: any) {
      if (err.message.startsWith('quota_exceeded')) {
        const [_, limit] = err.message.split(':');
        return NextResponse.json({ 
          error: 'quota_exceeded', 
          metric: 'alerts_processed', 
          limit: parseInt(limit) 
        }, { status: 429 });
      }
      throw err;
    }
  } catch (error) {
    console.error("[ingest:webhook] Error:", error);
    return NextResponse.json({ error: "Server Error" }, { status: 500 });
  }
}
