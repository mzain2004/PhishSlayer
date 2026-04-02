export interface IdentityActor {
  id: string;
  type: "user" | "managed_identity" | "app_registration" | "service_principal";
  displayName: string;
  email?: string;
  appId?: string;
}

export interface SignInEvent {
  id: string;
  actorId: string;
  actorType: IdentityActor["type"];
  timestamp: string;
  ipAddress: string;
  location?: {
    city: string;
    country: string;
    geoCoordinates?: { latitude: number; longitude: number };
  };
  deviceId?: string;
  deviceName?: string;
  deviceTrustType?: string;
  isCompliant?: boolean;
  deviceComplianceScore: number;
  mfaMethod?: string;
  conditionalAccessStatus: string;
  riskLevel: "none" | "low" | "medium" | "high";
  appDisplayName?: string;
  correlationId?: string;
  sessionId?: string;
  compositeKey: string;
}

export interface PrivilegeEvent {
  id: string;
  actorId: string;
  action: string;
  role: string;
  targetId?: string;
  timestamp: string;
  isTimeBounded: boolean;
  validFrom?: string;
  validTo?: string;
  privilegeState: "active" | "expired" | "pending";
  sessionCompositeKey?: string;
}

export interface IdentityChainLink {
  type: "signin" | "device" | "privilege" | "action";
  data: SignInEvent | PrivilegeEvent | Record<string, unknown>;
  confidenceScore: number;
  linkedToCompositeKey?: string;
}

export interface IdentityChain {
  chainId: string;
  actorId: string;
  actorType: IdentityActor["type"];
  startTime: string;
  endTime: string;
  links: IdentityChainLink[];
  overallConfidence: number;
  isPartialGraph: boolean;
  verdict: string;
}
