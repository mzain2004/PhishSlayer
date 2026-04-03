/**
 * Scott's insight: The system must be reliable
 * AND explainable. Analysts need to justify
 * investigation decisions.
 */

export interface VerdictExplanation {
  summary: string;
  confidenceScore: number;
  factors: ExplanationFactor[];
  decayInfo?: string;
  missingSignals?: string[];
  recommendation: string;
}

export interface ExplanationFactor {
  signal: string;
  status: "positive" | "negative" | "warning" | "neutral";
  impact: "high" | "medium" | "low";
  description: string;
  scoreContribution: number;
}

export function explainChainConfidence(params: {
  weightedScore: number;
  decayedScore: number;
  decayImpact: number;
  staleLinks: number;
  missingSignals: string[];
  breakdown: Record<string, number>;
  riskLevel: string;
  mfaMethod?: string;
  deviceComplianceScore?: number;
  conditionalAccessStatus?: string;
}): VerdictExplanation {
  const factors: ExplanationFactor[] = [];

  // Device binding factor
  if (params.breakdown.device_binding !== undefined) {
    factors.push({
      signal: "Device Binding",
      status:
        params.deviceComplianceScore && params.deviceComplianceScore >= 70
          ? "positive"
          : "warning",
      impact: "high",
      description: params.deviceComplianceScore
        ? `Device compliance score: ${params.deviceComplianceScore}%`
        : "No device binding available",
      scoreContribution: params.breakdown.device_binding || 0,
    });
  }

  // MFA factor
  factors.push({
    signal: "MFA Verification",
    status: params.mfaMethod ? "positive" : "negative",
    impact: "high",
    description: params.mfaMethod
      ? `Verified via ${params.mfaMethod}`
      : "No MFA detected - higher risk",
    scoreContribution: params.breakdown.mfa_verification || 0,
  });

  // Conditional access factor
  if (params.conditionalAccessStatus) {
    factors.push({
      signal: "Conditional Access",
      status:
        params.conditionalAccessStatus === "success" ? "positive" : "negative",
      impact: "medium",
      description: `CA policy: ${params.conditionalAccessStatus}`,
      scoreContribution: 10,
    });
  }

  // Decay factor
  if (params.decayImpact > 0) {
    factors.push({
      signal: "Confidence Decay",
      status: params.decayImpact > 20 ? "negative" : "warning",
      impact: params.decayImpact > 20 ? "high" : "medium",
      description: `Score reduced by ${params.decayImpact} points due to time elapsed without revalidation`,
      scoreContribution: -params.decayImpact,
    });
  }

  // Stale links warning
  if (params.staleLinks > 0) {
    factors.push({
      signal: "Stale Evidence",
      status: "warning",
      impact: "medium",
      description: `${params.staleLinks} chain link(s) are stale - context not revalidated`,
      scoreContribution: 0,
    });
  }

  // Build human readable summary
  const positives = factors
    .filter((f) => f.status === "positive")
    .map((f) => f.signal);
  const negatives = factors
    .filter((f) => f.status === "negative")
    .map((f) => f.signal);
  const warnings = factors
    .filter((f) => f.status === "warning")
    .map((f) => f.signal);

  let summary = `${params.decayedScore}% confidence`;
  if (positives.length > 0) {
    summary += ` - verified: ${positives.join(", ")}`;
  }
  if (negatives.length > 0) {
    summary += ` - missing: ${negatives.join(", ")}`;
  }
  if (warnings.length > 0) {
    summary += ` - warnings: ${warnings.join(", ")}`;
  }

  // Recommendation
  let recommendation = "";
  if (params.decayedScore >= 80) {
    recommendation =
      "High confidence chain. Standard investigation procedures apply.";
  } else if (params.decayedScore >= 60) {
    recommendation =
      "Moderate confidence. Collect additional signals before escalating.";
  } else if (params.decayedScore >= 40) {
    recommendation = "Low confidence partial graph. Manual analyst review required.";
  } else {
    recommendation =
      "Very low confidence. Insufficient evidence - gather more telemetry.";
  }

  return {
    summary,
    confidenceScore: params.decayedScore,
    factors,
    decayInfo:
      params.decayImpact > 0
        ? `Decayed by ${params.decayImpact} points (${params.staleLinks} stale links)`
        : undefined,
    missingSignals:
      params.missingSignals.length > 0 ? params.missingSignals : undefined,
    recommendation,
  };
}
