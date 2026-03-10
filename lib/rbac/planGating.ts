export type SubscriptionTier = 'free' | 'pro' | 'enterprise';

export const PLAN_PRICES: Record<SubscriptionTier, number> = {
  free: 0,
  pro: 99,
  enterprise: 299,
};

export const PLAN_FEATURES: Record<SubscriptionTier, {
  maxScansPerDay: number;
  aiHeuristics: boolean;
  portPatrol: boolean;
  siemIntegration: boolean;
  takedownGenerator: boolean;
  auditLog: boolean;
  userManagement: boolean;
  apiAccess: boolean;
  maxApiCallsPerMonth: number;
  maxTeamMembers: number;
  scanHistoryDays: number;
}> = {
  free: {
    maxScansPerDay: 10,
    aiHeuristics: false,
    portPatrol: false,
    siemIntegration: false,
    takedownGenerator: false,
    auditLog: false,
    userManagement: false,
    apiAccess: false,
    maxApiCallsPerMonth: 0,
    maxTeamMembers: 1,
    scanHistoryDays: 7,
  },
  pro: {
    maxScansPerDay: -1,
    aiHeuristics: true,
    portPatrol: true,
    siemIntegration: true,
    takedownGenerator: false,
    auditLog: false,
    userManagement: false,
    apiAccess: true,
    maxApiCallsPerMonth: 1000,
    maxTeamMembers: 5,
    scanHistoryDays: 90,
  },
  enterprise: {
    maxScansPerDay: -1,
    aiHeuristics: true,
    portPatrol: true,
    siemIntegration: true,
    takedownGenerator: true,
    auditLog: true,
    userManagement: true,
    apiAccess: true,
    maxApiCallsPerMonth: -1,
    maxTeamMembers: -1,
    scanHistoryDays: -1,
  },
};

export function canAccessFeature(
  tier: SubscriptionTier,
  feature: keyof typeof PLAN_FEATURES['free']
): boolean {
  const val = PLAN_FEATURES[tier]?.[feature];
  if (typeof val === 'boolean') return val;
  if (typeof val === 'number') return val !== 0;
  return false;
}

export function getUpgradeMessage(feature: string): string {
  return `${feature} is not available on your current plan. Upgrade to Pro or Enterprise to unlock this feature.`;
}

export function getPlanLabel(tier: SubscriptionTier): string {
  return tier.charAt(0).toUpperCase() + tier.slice(1);
}
