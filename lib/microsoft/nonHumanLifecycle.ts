/**
 * Scott's insight: Model lifecycle not just existence.
 * Creation, consent, token issuance, and usage patterns
 * are often more telling than the identity itself.
 */

import { graphClient } from "./graphClient";

export interface NonHumanLifecycleEvent {
  identityId: string;
  identityName: string;
  identityType: "service_principal" | "managed_identity" | "app_registration";
  eventType:
    | "created"
    | "consent_granted"
    | "token_issued"
    | "permission_changed"
    | "credential_added"
    | "usage_detected";
  timestamp: string;
  details: string;
  riskScore: number;
  riskReasons: string[];
}

export interface NonHumanLifecycleSummary {
  identityId: string;
  identityName: string;
  type: string;
  createdAt?: string;
  lastActivity?: string;
  consentEvents: number;
  tokenEvents: number;
  permissionChanges: number;
  overallRisk: "low" | "medium" | "high" | "critical";
  riskScore: number;
  lifecycleEvents: NonHumanLifecycleEvent[];
}

type GraphDirectoryAuditEvent = {
  activityDateTime?: string;
  activityDisplayName?: string;
  targetResources?: Array<{
    id?: string;
    displayName?: string;
    type?: string;
  }>;
};

export async function fetchNonHumanLifecycle(
  hoursBack: number = 72,
): Promise<NonHumanLifecycleSummary[]> {
  const startTime = new Date(
    Date.now() - hoursBack * 60 * 60 * 1000,
  ).toISOString();

  const summaries: NonHumanLifecycleSummary[] = [];

  try {
    // Fetch service principal audit events
    const auditResponse = (await graphClient
      .api("/auditLogs/directoryAudits")
      .filter(
        `activityDateTime ge ${startTime} and ` +
          `(category eq 'ApplicationManagement' or ` +
          `category eq 'ServicePrincipal')`,
      )
      .select(
        [
          "id",
          "activityDateTime",
          "activityDisplayName",
          "initiatedBy",
          "targetResources",
          "result",
          "category",
        ].join(","),
      )
      .top(100)
      .get()) as {
      value?: GraphDirectoryAuditEvent[];
    };

    // Group by target identity
    const identityGroups = new Map<string, NonHumanLifecycleEvent[]>();

    for (const event of auditResponse.value || []) {
      const target = event.targetResources?.[0];
      if (!target?.id) continue;

      const lifecycleEvent = mapToLifecycleEvent(event, target);

      if (!identityGroups.has(target.id)) {
        identityGroups.set(target.id, []);
      }
      identityGroups.get(target.id)!.push(lifecycleEvent);
    }

    // Build summaries
    for (const [id, events] of identityGroups) {
      const summary = buildLifecycleSummary(id, events);
      summaries.push(summary);
    }
  } catch (error) {
    console.error("Non-human lifecycle fetch error:", error);
  }

  return summaries.sort((a, b) => b.riskScore - a.riskScore);
}

function mapToLifecycleEvent(
  event: GraphDirectoryAuditEvent,
  target: { id?: string; displayName?: string; type?: string },
): NonHumanLifecycleEvent {
  const activity = event.activityDisplayName?.toLowerCase() || "";
  const riskReasons: string[] = [];
  let riskScore = 20;
  let eventType: NonHumanLifecycleEvent["eventType"] = "usage_detected";

  if (activity.includes("add") && activity.includes("app")) {
    eventType = "created";
    riskScore = 30;
  } else if (activity.includes("consent")) {
    eventType = "consent_granted";
    riskScore = 60;
    riskReasons.push("New consent grant - review permissions");
  } else if (
    activity.includes("credential") ||
    activity.includes("secret") ||
    activity.includes("certificate")
  ) {
    eventType = "credential_added";
    riskScore = 75;
    riskReasons.push("New credential added to service principal");
  } else if (activity.includes("token")) {
    eventType = "token_issued";
    riskScore = 55;
    riskReasons.push("Token issuance event observed");
  } else if (activity.includes("role") || activity.includes("permission")) {
    eventType = "permission_changed";
    riskScore = 65;
    riskReasons.push("Permission scope changed");
  }

  const lowerType = target.type?.toLowerCase() || "";
  const identityType: NonHumanLifecycleEvent["identityType"] =
    lowerType.includes("managed")
      ? "managed_identity"
      : lowerType.includes("application")
        ? "app_registration"
        : "service_principal";

  return {
    identityId: target.id || "unknown",
    identityName: target.displayName || "Unknown",
    identityType,
    eventType,
    timestamp: event.activityDateTime || new Date().toISOString(),
    details: event.activityDisplayName || "Unknown activity",
    riskScore,
    riskReasons,
  };
}

function buildLifecycleSummary(
  id: string,
  events: NonHumanLifecycleEvent[],
): NonHumanLifecycleSummary {
  const sorted = [...events].sort(
    (a, b) =>
      new Date(a.timestamp).getTime() - new Date(b.timestamp).getTime(),
  );

  const avgRisk = Math.round(
    events.reduce((sum, event) => sum + event.riskScore, 0) / events.length,
  );

  const maxRisk = Math.max(...events.map((event) => event.riskScore));

  let overallRisk: NonHumanLifecycleSummary["overallRisk"] = "low";
  if (maxRisk >= 75) overallRisk = "critical";
  else if (maxRisk >= 60) overallRisk = "high";
  else if (maxRisk >= 40) overallRisk = "medium";

  return {
    identityId: id,
    identityName: events[0]?.identityName || "Unknown",
    type: events[0]?.identityType || "service_principal",
    createdAt: sorted[0]?.timestamp,
    lastActivity: sorted[sorted.length - 1]?.timestamp,
    consentEvents: events.filter((event) => event.eventType === "consent_granted")
      .length,
    tokenEvents: events.filter((event) => event.eventType === "token_issued")
      .length,
    permissionChanges: events.filter(
      (event) => event.eventType === "permission_changed",
    ).length,
    overallRisk,
    riskScore: avgRisk,
    lifecycleEvents: sorted,
  };
}
