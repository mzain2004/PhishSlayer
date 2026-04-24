import { SupabaseClient } from "@supabase/supabase-js";
import { RawLogEntry, ConnectorSyncResult } from "../soc/types";
import { IngestionPipeline } from "../ingestion/pipeline";

let cachedToken: string | null = null;
let tokenExpiry: number = 0;

async function getCrowdStrikeToken(): Promise<string | null> {
  const clientId = process.env.CROWDSTRIKE_CLIENT_ID;
  const clientSecret = process.env.CROWDSTRIKE_CLIENT_SECRET;

  if (!clientId || !clientSecret) {
    console.warn("[crowdstrike] Credentials not set");
    return null;
  }

  if (cachedToken && Date.now() < tokenExpiry) return cachedToken;

  try {
    const params = new URLSearchParams();
    params.append("client_id", clientId);
    params.append("client_secret", clientSecret);

    const res = await fetch("https://api.crowdstrike.com/oauth2/token", {
      method: "POST",
      headers: { "Content-Type": "application/x-www-form-urlencoded" },
      body: params
    });

    if (!res.ok) throw new Error(`Token fetch failed: ${res.statusText}`);
    const data = await res.json();

    cachedToken = data.access_token;
    tokenExpiry = Date.now() + (data.expires_in * 1000) - 60000;
    return cachedToken;
  } catch (error) {
    console.error("[crowdstrike] Token error:", error);
    return null;
  }
}

export async function fetchCrowdStrikeDetections(since_minutes: number = 60): Promise<any[]> {
  const token = await getCrowdStrikeToken();
  if (!token) return [];

  const sinceDate = new Date(Date.now() - since_minutes * 60 * 1000).toISOString();
  
  try {
    const queryRes = await fetch(`https://api.crowdstrike.com/detects/queries/detects/v1?filter=created_timestamp:>='${sinceDate}'`, {
      headers: { "Authorization": `Bearer ${token}` }
    });

    if (!queryRes.ok) throw new Error("Detection query failed");
    const queryData = await queryRes.json();
    const ids = queryData.resources || [];

    if (ids.length === 0) return [];

    const entityRes = await fetch("https://api.crowdstrike.com/detects/entities/detects/v1", {
      method: "POST",
      headers: { 
        "Authorization": `Bearer ${token}`,
        "Content-Type": "application/json"
      },
      body: JSON.stringify({ ids })
    });

    if (!entityRes.ok) throw new Error("Detection entity fetch failed");
    const entityData = await entityRes.json();
    return entityData.resources || [];
  } catch (error) {
    console.error("[crowdstrike] Fetch error:", error);
    return [];
  }
}

export async function syncCrowdStrike(supabase: SupabaseClient): Promise<ConnectorSyncResult> {
  const detections = await fetchCrowdStrikeDetections();
  const pipeline = new IngestionPipeline(supabase);
  const orgId = process.env.SYSTEM_ORG_ID || "system";
  
  let successCount = 0;
  const errors: string[] = [];

  for (const det of detections) {
    try {
        await pipeline.ingestLog(JSON.stringify(det), "json", orgId, det.device?.external_ip);
        successCount++;
    } catch (e: any) {
        errors.push(e.message);
    }
  }

  return {
    connector_type: "crowdstrike",
    success: errors.length === 0,
    records_synced: successCount,
    errors,
    synced_at: new Date()
  };
}
