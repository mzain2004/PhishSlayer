import { graphClient } from "./graphClient";
import { buildCompositeKey, calculateDeviceConfidence } from "./compositeKey";
import type { IdentityActor, SignInEvent } from "./types";

type GraphSignIn = {
  id?: string;
  createdDateTime?: string;
  userPrincipalName?: string;
  userId?: string;
  appDisplayName?: string;
  ipAddress?: string;
  location?: {
    city?: string;
    countryOrRegion?: string;
    geoCoordinates?: { latitude?: number; longitude?: number };
  };
  deviceDetail?: {
    deviceId?: string;
    displayName?: string;
    trustType?: string;
    isCompliant?: boolean;
  };
  conditionalAccessStatus?: string;
  mfaDetail?: { authMethod?: string };
  riskLevelAggregated?: string;
  correlationId?: string;
  authenticationDetails?: Array<{ requestId?: string }>;
};

type GraphServicePrincipal = {
  id?: string;
  displayName?: string;
  appId?: string;
  servicePrincipalType?: string;
};

function toRiskLevel(input?: string): SignInEvent["riskLevel"] {
  if (input === "low" || input === "medium" || input === "high") {
    return input;
  }
  return "none";
}

export async function fetchRecentSignIns(
  hoursBack: number = 24,
): Promise<SignInEvent[]> {
  const startTime = new Date(
    Date.now() - hoursBack * 60 * 60 * 1000,
  ).toISOString();

  try {
    const response = (await graphClient
      .api("/auditLogs/signIns")
      .filter(`createdDateTime ge ${startTime}`)
      .select(
        [
          "id",
          "createdDateTime",
          "userPrincipalName",
          "userId",
          "appDisplayName",
          "ipAddress",
          "location",
          "deviceDetail",
          "status",
          "conditionalAccessStatus",
          "mfaDetail",
          "riskLevelAggregated",
          "correlationId",
          "authenticationDetails",
        ].join(","),
      )
      .top(100)
      .get()) as { value?: GraphSignIn[] };

    return (response.value || []).map((signin) => {
      const sessionId = signin.authenticationDetails?.[0]?.requestId;

      const compositeKey = buildCompositeKey({
        userId: signin.userId,
        deviceId: signin.deviceDetail?.deviceId,
        ipAddress: signin.ipAddress,
        timestamp: signin.createdDateTime || new Date().toISOString(),
        correlationId: signin.correlationId,
        sessionId,
      });

      const deviceConfidence = calculateDeviceConfidence({
        isCompliant: signin.deviceDetail?.isCompliant,
        trustType: signin.deviceDetail?.trustType,
        mdeDataAvailable: Boolean(signin.deviceDetail?.deviceId),
      });

      const event: SignInEvent = {
        id: signin.id || crypto.randomUUID(),
        actorId: signin.userId || "unknown",
        actorType: "user",
        timestamp: signin.createdDateTime || new Date().toISOString(),
        ipAddress: signin.ipAddress || "",
        location: signin.location
          ? {
              city: signin.location.city || "",
              country: signin.location.countryOrRegion || "",
              geoCoordinates:
                typeof signin.location.geoCoordinates?.latitude === "number" &&
                typeof signin.location.geoCoordinates?.longitude === "number"
                  ? {
                      latitude: signin.location.geoCoordinates.latitude,
                      longitude: signin.location.geoCoordinates.longitude,
                    }
                  : undefined,
            }
          : undefined,
        deviceId: signin.deviceDetail?.deviceId,
        deviceName: signin.deviceDetail?.displayName,
        deviceTrustType: signin.deviceDetail?.trustType,
        isCompliant: signin.deviceDetail?.isCompliant,
        deviceComplianceScore: deviceConfidence,
        mfaMethod: signin.mfaDetail?.authMethod,
        conditionalAccessStatus: signin.conditionalAccessStatus || "unknown",
        riskLevel: toRiskLevel(signin.riskLevelAggregated),
        appDisplayName: signin.appDisplayName,
        correlationId: signin.correlationId,
        sessionId,
        compositeKey,
      };

      return event;
    });
  } catch (error) {
    console.error("Graph sign-in fetch error:", error);
    return [];
  }
}

export async function fetchNonHumanIdentities(): Promise<IdentityActor[]> {
  // Scott's insight: model managed identities as
  // first-class actors not afterthoughts
  const actors: IdentityActor[] = [];

  try {
    const spResponse = (await graphClient
      .api("/servicePrincipals")
      .select("id,displayName,appId,servicePrincipalType")
      .top(100)
      .get()) as { value?: GraphServicePrincipal[] };

    for (const sp of spResponse.value || []) {
      const servicePrincipalType = sp.servicePrincipalType || "";
      const type: IdentityActor["type"] =
        servicePrincipalType === "ManagedIdentity"
          ? "managed_identity"
          : servicePrincipalType === "Application"
            ? "app_registration"
            : "service_principal";

      actors.push({
        id: sp.id || crypto.randomUUID(),
        type,
        displayName: sp.displayName || "unknown",
        appId: sp.appId,
      });
    }
  } catch (error) {
    console.error("Non-human identity fetch error:", error);
  }

  return actors;
}
