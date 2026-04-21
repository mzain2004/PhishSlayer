import { createClient } from "@/lib/supabase/server";
import { auth } from "@clerk/nextjs/server";

export interface EndpointEvent {
  id: string;
  user_id: string;
  process_name: string;
  pid: string;
  remote_address: string;
  remote_port: number;
  country: string | null;
  country_code: string | null;
  city: string | null;
  isp: string | null;
  threat_level: string;
  threat_score: number;
  source: string;
  timestamp: string;
  raw_event: Record<string, unknown> | null;
  created_at: string;
}

export interface EndpointStats {
  total: number;
  critical: number;
  high: number;
  medium: number;
  low: number;
  uniqueIps: number;
  topProcesses: { name: string; count: number }[];
}

export async function getEndpointEvents(limit = 100): Promise<EndpointEvent[]> {
  try {
    const { userId } = await auth();
    if (!userId) return [];
    const supabase = await createClient();

    try {
      const { data, error } = await supabase
        .from("endpoint_events")
        .select("*")
        .order("created_at", { ascending: false })
        .limit(limit);

      if (error) {
        console.error("[agentQueries] getEndpointEvents error:", error);
        return [];
      }
      return (data || []) as EndpointEvent[];
    } catch (error) {
      console.error("[agentQueries] getEndpointEvents query error:", error);
      return [];
    }
  } catch (err) {
    console.error("[agentQueries] getEndpointEvents exception:", err);
    return [];
  }
}

export async function getEndpointStats(): Promise<EndpointStats> {
  const empty: EndpointStats = {
    total: 0,
    critical: 0,
    high: 0,
    medium: 0,
    low: 0,
    uniqueIps: 0,
    topProcesses: [],
  };

  try {
    const { userId } = await auth();
    if (!userId) return empty;
    const supabase = await createClient();

    let data: any[] | null = null;
    try {
      const response = await supabase
        .from("endpoint_events")
        .select("threat_level, remote_address, process_name");
      if (response.error || !response.data) {
        if (response.error) {
          console.error(
            "[agentQueries] getEndpointStats error:",
            response.error,
          );
        }
        return empty;
      }
      data = response.data as any[];
    } catch (error) {
      console.error("[agentQueries] getEndpointStats query error:", error);
      return empty;
    }

    const stats: EndpointStats = { ...empty, total: data.length };
    const ipSet = new Set<string>();
    const processMap = new Map<string, number>();

    for (const row of data) {
      const level = (row.threat_level || "low").toLowerCase();
      if (level === "critical") stats.critical++;
      else if (level === "high") stats.high++;
      else if (level === "medium") stats.medium++;
      else stats.low++;

      ipSet.add(row.remote_address);
      processMap.set(
        row.process_name,
        (processMap.get(row.process_name) || 0) + 1,
      );
    }

    stats.uniqueIps = ipSet.size;
    stats.topProcesses = Array.from(processMap.entries())
      .map(([name, count]) => ({ name, count }))
      .sort((a, b) => b.count - a.count)
      .slice(0, 5);

    return stats;
  } catch (err) {
    console.error("[agentQueries] getEndpointStats exception:", err);
    return empty;
  }
}

export async function getRecentCriticalEvents(
  limit = 5,
): Promise<EndpointEvent[]> {
  try {
    const { userId } = await auth();
    if (!userId) return [];
    const supabase = await createClient();

    const cutoff = new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString();
    try {
      const { data, error } = await supabase
        .from("endpoint_events")
        .select("*")
        .in("threat_level", ["critical", "high"])
        .gte("created_at", cutoff)
        .order("created_at", { ascending: false })
        .limit(limit);

      if (error) {
        console.error("[agentQueries] getRecentCriticalEvents error:", error);
        return [];
      }
      return (data || []) as EndpointEvent[];
    } catch (error) {
      console.error(
        "[agentQueries] getRecentCriticalEvents query error:",
        error,
      );
      return [];
    }
  } catch (err) {
    console.error("[agentQueries] getRecentCriticalEvents exception:", err);
    return [];
  }
}
