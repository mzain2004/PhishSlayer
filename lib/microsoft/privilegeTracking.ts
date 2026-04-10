import { getGraphClient } from "./graphClient";
import type { PrivilegeEvent } from "./types";

type GraphDirectoryAudit = {
  id?: string;
  activityDateTime?: string;
  activityDisplayName?: string;
  initiatedBy?: {
    user?: { id?: string };
    app?: { id?: string };
  };
  targetResources?: Array<{ id?: string; displayName?: string }>;
  result?: string;
};

export async function fetchPrivilegeEvents(
  hoursBack: number = 24,
): Promise<PrivilegeEvent[]> {
  const graphClient = getGraphClient();
  const startTime = new Date(
    Date.now() - hoursBack * 60 * 60 * 1000,
  ).toISOString();

  try {
    const response = (await graphClient
      .api("/auditLogs/directoryAudits")
      .filter(
        `activityDateTime ge ${startTime} and ` +
          `(category eq 'RoleManagement' or ` +
          `category eq 'EntitlementManagement')`,
      )
      .select(
        [
          "id",
          "activityDateTime",
          "activityDisplayName",
          "initiatedBy",
          "targetResources",
          "result",
        ].join(","),
      )
      .top(50)
      .get()) as { value?: GraphDirectoryAudit[] };

    return (response.value || []).map((event) => {
      const actor = event.initiatedBy?.user || event.initiatedBy?.app;
      const activity = event.activityDisplayName || "unknown";

      // Scott's insight: model privilege as
      // time-bounded state not discrete event
      const lowerActivity = activity.toLowerCase();
      const isPimEvent =
        lowerActivity.includes("pim") || lowerActivity.includes("eligible");

      const timestamp = event.activityDateTime || new Date().toISOString();
      const validTo = isPimEvent
        ? new Date(
            new Date(timestamp).getTime() + 4 * 60 * 60 * 1000,
          ).toISOString()
        : undefined;

      const privilegeState: PrivilegeEvent["privilegeState"] =
        event.result === "success"
          ? validTo && new Date(validTo).getTime() < Date.now()
            ? "expired"
            : "active"
          : "pending";

      return {
        id: event.id || crypto.randomUUID(),
        actorId: actor?.id || "unknown",
        action: activity,
        role: event.targetResources?.[0]?.displayName || "unknown",
        targetId: event.targetResources?.[0]?.id,
        timestamp,
        isTimeBounded: isPimEvent,
        privilegeState,
        validFrom: isPimEvent ? timestamp : undefined,
        // PIM typically grants 1-8 hour windows
        validTo,
      };
    });
  } catch (error) {
    console.error("Privilege event fetch error:", error);
    return [];
  }
}
