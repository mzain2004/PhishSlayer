import { SupabaseClient } from "@supabase/supabase-js";
import { ConnectorSyncResult } from "../soc/types";
import { IngestionPipeline } from "../ingestion/pipeline";

export async function fetchElasticAlerts(since_minutes: number = 60): Promise<any[]> {
  const url = process.env.ELASTIC_URL;
  const apiKey = process.env.ELASTIC_API_KEY;

  if (!url || !apiKey) {
    console.warn("[elastic] Not configured");
    return [];
  }

  try {
    const res = await fetch(`${url}/.alerts-security.alerts-default/_search`, {
      method: "POST",
      headers: {
        "Authorization": `ApiKey ${apiKey}`,
        "Content-Type": "application/json"
      },
      body: JSON.stringify({
        query: {
          bool: {
            filter: [
              { range: { "@timestamp": { gte: `now-${since_minutes}m` } } }
            ]
          }
        }
      })
    });

    if (!res.ok) throw new Error(`Elastic search failed: ${res.statusText}`);
    const data = await res.json();
    return data.hits?.hits || [];
  } catch (error) {
    console.error("[elastic] Error:", error);
    return [];
  }
}

export async function syncElastic(supabase: SupabaseClient): Promise<ConnectorSyncResult> {
  const hits = await fetchElasticAlerts();
  const pipeline = new IngestionPipeline(supabase);
  const orgId = process.env.SYSTEM_ORG_ID || "system";

  let successCount = 0;
  const errors: string[] = [];

  for (const hit of hits) {
    try {
        await pipeline.ingestLog(JSON.stringify(hit._source), "json", orgId, hit._source?.source?.ip);
        successCount++;
    } catch (e: any) {
        errors.push(e.message);
    }
  }

  return {
    connector_type: "elastic",
    success: errors.length === 0,
    records_synced: successCount,
    errors,
    synced_at: new Date()
  };
}
