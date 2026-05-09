import { createClient } from "@/lib/supabase/server";

/**
 * Maintenance windows: never auto-block during maintenance unless severity = CRITICAL.
 */
export async function isMaintenanceWindow(orgId: string): Promise<boolean> {
  const supabase = await createClient();
  const now = new Date().toISOString();
  const { data } = await supabase
    .from("maintenance_windows")
    .select("id")
    .eq("organization_id", orgId)
    .lte("start_time", now)
    .gte("end_time", now)
    .maybeSingle();
  return !!data;
}

export async function createMaintenanceWindow(
  orgId: string,
  startTime: string,
  endTime: string,
  description: string,
  createdBy: string
): Promise<void> {
  const supabase = await createClient();
  await supabase.from("maintenance_windows").insert({
    organization_id: orgId,
    start_time: startTime,
    end_time: endTime,
    description,
    created_by: createdBy,
  });
}

export async function listMaintenanceWindows(orgId: string) {
  const supabase = await createClient();
  const { data } = await supabase
    .from("maintenance_windows")
    .select("*")
    .eq("organization_id", orgId)
    .order("start_time", { ascending: false });
  return data ?? [];
}
