/**
 * Scott's insight: Some links are stronger than others.
 * Device binding might be high confidence, IP correlation
 * much weaker. Treating all edges equally creates
 * false certainty.
 */

export const EDGE_WEIGHTS = {
  // Signal type weights (sum should = 1.0)
  device_binding: 0.35, // Strongest - hardware bound
  mfa_verification: 0.25, // Strong - user verification
  session_token: 0.2, // Medium - can be replayed
  ip_correlation: 0.1, // Weak - easily spoofed
  geo_location: 0.05, // Weakest - easily bypassed
  time_window: 0.05, // Context only
} as const;

export const SIGNAL_CONFIDENCE_CAPS = {
  device_binding: 95,
  mfa_verification: 90,
  session_token: 75,
  ip_correlation: 50,
  geo_location: 40,
  time_window: 60,
} as const;

export interface WeightedSignal {
  type: keyof typeof EDGE_WEIGHTS;
  rawScore: number;
  available: boolean;
}

/**
 * Calculates weighted confidence from multiple signals
 * Scott's model: not all signals are equal
 */
export function calculateWeightedConfidence(signals: WeightedSignal[]): {
  weightedScore: number;
  availableWeight: number;
  missingSignals: string[];
  breakdown: Record<string, number>;
} {
  const availableSignals = signals.filter((s) => s.available);
  const missingSignals = signals.filter((s) => !s.available).map((s) => s.type);

  if (availableSignals.length === 0) {
    return {
      weightedScore: 0,
      availableWeight: 0,
      missingSignals,
      breakdown: {},
    };
  }

  // Normalize weights for available signals only
  const totalAvailableWeight = availableSignals.reduce(
    (sum, signal) => sum + EDGE_WEIGHTS[signal.type],
    0,
  );

  let weightedSum = 0;
  const breakdown: Record<string, number> = {};

  for (const signal of availableSignals) {
    const normalizedWeight = EDGE_WEIGHTS[signal.type] / totalAvailableWeight;
    const cappedScore = Math.min(
      signal.rawScore,
      SIGNAL_CONFIDENCE_CAPS[signal.type],
    );
    const contribution = cappedScore * normalizedWeight;

    weightedSum += contribution;
    breakdown[signal.type] = Math.round(contribution);
  }

  return {
    weightedScore: Math.round(weightedSum),
    availableWeight: Math.round(totalAvailableWeight * 100),
    missingSignals,
    breakdown,
  };
}

/**
 * Builds weighted signals from a sign-in event
 */
export function extractSignals(signin: {
  deviceComplianceScore?: number;
  deviceId?: string;
  mfaMethod?: string;
  correlationId?: string;
  ipAddress?: string;
  location?: { city?: string };
}): WeightedSignal[] {
  return [
    {
      type: "device_binding",
      rawScore: signin.deviceComplianceScore || 0,
      available: Boolean(signin.deviceId),
    },
    {
      type: "mfa_verification",
      rawScore: signin.mfaMethod ? 90 : 0,
      available: Boolean(signin.mfaMethod),
    },
    {
      type: "session_token",
      rawScore: signin.correlationId ? 70 : 30,
      available: true, // always present but quality varies
    },
    {
      type: "ip_correlation",
      rawScore: signin.ipAddress ? 50 : 0,
      available: Boolean(signin.ipAddress),
    },
    {
      type: "geo_location",
      rawScore: signin.location ? 40 : 0,
      available: Boolean(signin.location?.city),
    },
    {
      type: "time_window",
      rawScore: 60,
      available: true,
    },
  ];
}
