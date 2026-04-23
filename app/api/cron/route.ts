import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { HuntEngine } from "@/lib/soc/hunting/engine";
import { syncAllFeeds } from "@/lib/soc/intel/index";
import { IngestionPipeline } from "@/lib/ingestion/pipeline";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

export async function POST(req: Request) {
  const authHeader = req.headers.get("authorization");
  if (authHeader !== `Bearer ${process.env.CRON_SECRET}`) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    const supabase = await createClient();
    
    // 1. Ingest emails at 00:00 UTC
    const pipeline = new IngestionPipeline(supabase);
    await pipeline.ingestEmail({
        host: process.env.IMAP_HOST,
        user: process.env.IMAP_USER,
        password: process.env.IMAP_PASSWORD
    });

    // 2. Sync Threat Intel daily at 01:00 UTC (triggered by cron)
    await syncAllFeeds(supabase);

    const huntEngine = new HuntEngine(supabase);
    // 3. Run scheduled hunts for default org at 02:00 UTC
    await huntEngine.scheduleHunts("default");

    return NextResponse.json({ success: true, timestamp: new Date().toISOString() });
  } catch (error) {
    console.error("[cron] Task execution failure:", error);
    return NextResponse.json({ error: "Internal Server Error" }, { status: 500 });
  }
}
