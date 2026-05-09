import { createClient } from "@/lib/supabase/server";

/**
 * Critical assets that NEVER get auto-blocked without human approval.
 * Stored per-org in Supabase critical_assets table.
 */
export async function isWhitelistedAsset(
  orgId: string,
  assetIdentifier: string
): Promise<boolean> {
  const supabase = await createClient();
  const { data } = await supabase
    .from("critical_assets")
    .select("id")
    .eq("organization_id", orgId)
    .eq("identifier", assetIdentifier)
    .maybeSingle();
  return !!data;
}

export async function addCriticalAsset(
  orgId: string,
  identifier: string,
  assetType: string,
  reason: string,
  createdBy: string
): Promise<void> {
  const supabase = await createClient();
  await supabase.from("critical_assets").insert({
    organization_id: orgId,
    identifier,
    asset_type: assetType,
    reason,
    created_by: createdBy,
  });
}

export async function listCriticalAssets(orgId: string) {
  const supabase = await createClient();
  const { data } = await supabase
    .from("critical_assets")
    .select("*")
    .eq("organization_id", orgId)
    .order("created_at", { ascending: false });
  return data ?? [];
}
