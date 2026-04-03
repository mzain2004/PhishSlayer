import type { IdentityChain } from "./types";

export interface TimelineEvent {
  id: string;
  timestamp: string;
  type: "signin" | "device" | "privilege" | "action" | "alert";
  actor: string;
  actorType: string;
  title: string;
  description: string;
  confidenceScore: number;
  severity: "info" | "low" | "medium" | "high" | "critical";
  ipAddress?: string;
  location?: string;
  deviceName?: string;
  mfaMethod?: string;
  riskLevel?: string;
  privilegeRole?: string;
  isPartOfPartialGraph: boolean;
  chainId: string;
  explanation?: IdentityChain["explanation"];
}

type TimelineSource = {
  timestamp?: string;
  activityDateTime?: string;
  appDisplayName?: string;
  ipAddress?: string;
  location?: { city?: string; country?: string };
  riskLevel?: string;
  mfaMethod?: string;
  action?: string;
  role?: string;
  isTimeBounded?: boolean;
  deviceName?: string;
};

export function buildTimeline(chains: IdentityChain[]): TimelineEvent[] {
  const events: TimelineEvent[] = [];

  for (const chain of chains) {
    for (const link of chain.links) {
      const data = link.data as TimelineSource;
      const timestamp =
        data.timestamp || data.activityDateTime || new Date().toISOString();

      let title = "";
      let description = "";
      let severity: TimelineEvent["severity"] = "info";

      if (link.type === "signin") {
        title = `Sign-in: ${data.appDisplayName || "Unknown App"}`;
        description = `From ${data.ipAddress || "unknown IP"}`;
        if (data.location?.city) {
          description += ` in ${data.location.city}, ${data.location.country || "unknown"}`;
        }

        if (data.riskLevel === "high") severity = "critical";
        else if (data.riskLevel === "medium") severity = "high";
        else if (data.mfaMethod) severity = "info";
        else severity = "low";
      } else if (link.type === "privilege") {
        title = `Privilege: ${data.action || "Role Change"}`;
        description = `Role: ${data.role || "Unknown"}`;
        if (data.isTimeBounded) {
          description += " (PIM time-bounded)";
        }
        severity = data.role?.includes("Admin") ? "high" : "medium";
      } else {
        title = link.type.toUpperCase();
        description = "Identity chain event";
        severity = "info";
      }

      events.push({
        id: `${chain.chainId}-${link.type}-${timestamp}`,
        timestamp,
        type: link.type,
        actor: chain.actorId,
        actorType: chain.actorType,
        title,
        description,
        confidenceScore: link.confidenceScore,
        severity,
        ipAddress: data.ipAddress,
        location: data.location?.city
          ? `${data.location.city}, ${data.location.country || "unknown"}`
          : undefined,
        deviceName: data.deviceName,
        mfaMethod: data.mfaMethod,
        riskLevel: data.riskLevel,
        privilegeRole: data.role,
        isPartOfPartialGraph: chain.isPartialGraph,
        chainId: chain.chainId,
        explanation: chain.explanation,
      });
    }
  }

  // Sort chronologically
  return events.sort(
    (a, b) => new Date(a.timestamp).getTime() - new Date(b.timestamp).getTime(),
  );
}

export function calculateMTTR(events: TimelineEvent[]): {
  avgMinutes: number;
  minMinutes: number;
  maxMinutes: number;
  totalIncidents: number;
} {
  // MTTR = time from first alert to last event
  // in same chain (investigation resolution time)
  const chainGroups = new Map<string, TimelineEvent[]>();

  for (const event of events) {
    if (!chainGroups.has(event.chainId)) {
      chainGroups.set(event.chainId, []);
    }
    chainGroups.get(event.chainId)!.push(event);
  }

  const resolutionTimes: number[] = [];

  for (const [, chainEvents] of chainGroups) {
    if (chainEvents.length < 2) continue;

    const sorted = [...chainEvents].sort(
      (a, b) =>
        new Date(a.timestamp).getTime() - new Date(b.timestamp).getTime(),
    );

    const firstEvent = sorted[0];
    const lastEvent = sorted[sorted.length - 1];
    const diffMinutes =
      Math.abs(
        new Date(lastEvent.timestamp).getTime() -
          new Date(firstEvent.timestamp).getTime(),
      ) /
      (1000 * 60);

    resolutionTimes.push(diffMinutes);
  }

  if (resolutionTimes.length === 0) {
    return {
      avgMinutes: 0,
      minMinutes: 0,
      maxMinutes: 0,
      totalIncidents: 0,
    };
  }

  return {
    avgMinutes: Math.round(
      resolutionTimes.reduce((a, b) => a + b, 0) / resolutionTimes.length,
    ),
    minMinutes: Math.round(Math.min(...resolutionTimes)),
    maxMinutes: Math.round(Math.max(...resolutionTimes)),
    totalIncidents: resolutionTimes.length,
  };
}
