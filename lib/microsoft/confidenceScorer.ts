export interface ChainLinkScore {
  linkType: string;
  score: number;
  reasons: string[];
  penalties: string[];
}

export function scoreSignInLink(signin: any): ChainLinkScore {
  const reasons: string[] = [];
  const penalties: string[] = [];
  let score = 50;

  // MFA bonus
  if (signin.mfaMethod) {
    score += 15;
    reasons.push(`MFA used: ${signin.mfaMethod}`);
  } else {
    penalties.push("No MFA detected");
    score -= 10;
  }

  // Risk level
  if (signin.riskLevel === "none") {
    score += 10;
    reasons.push("No risk detected");
  } else if (signin.riskLevel === "low") {
    score += 5;
  } else if (signin.riskLevel === "medium") {
    score -= 15;
    penalties.push("Medium risk sign-in");
  } else if (signin.riskLevel === "high") {
    score -= 35;
    penalties.push("HIGH RISK sign-in detected");
  }

  // Conditional access
  if (signin.conditionalAccessStatus === "success") {
    score += 10;
    reasons.push("Conditional Access passed");
  } else if (signin.conditionalAccessStatus === "failure") {
    score -= 20;
    penalties.push("Conditional Access FAILED");
  }

  // Device compliance confidence
  if (signin.deviceComplianceScore >= 80) {
    score += 15;
    reasons.push(`Device confidence: ${signin.deviceComplianceScore}%`);
  } else if (signin.deviceComplianceScore < 40) {
    score -= 10;
    penalties.push(`Low device confidence: ${signin.deviceComplianceScore}%`);
  }

  // Composite key quality
  if (signin.compositeKey?.startsWith("unknown")) {
    score -= 20;
    penalties.push("Weak identity anchor - partial graph");
  } else {
    score += 5;
    reasons.push("Strong composite key");
  }

  return {
    linkType: "signin",
    score: Math.max(0, Math.min(100, Math.round(score))),
    reasons,
    penalties,
  };
}

export function scorePrivilegeLink(
  priv: any,
  matchedSignIn: boolean,
): ChainLinkScore {
  const reasons: string[] = [];
  const penalties: string[] = [];
  let score = 40;

  if (matchedSignIn) {
    score += 35;
    reasons.push("Linked to verified sign-in session");
  } else {
    penalties.push("No matching sign-in found - orphaned privilege");
    score -= 15;
  }

  if (priv.isTimeBounded) {
    score += 15;
    reasons.push("PIM time-bounded elevation");
  }

  if (priv.privilegeState === "active") {
    score += 10;
  } else if (priv.privilegeState === "expired") {
    penalties.push("Privilege window expired");
    score -= 5;
  }

  return {
    linkType: "privilege",
    score: Math.max(0, Math.min(100, Math.round(score))),
    reasons,
    penalties,
  };
}

export function calculateOverallChainScore(links: ChainLinkScore[]): number {
  if (links.length === 0) return 0;

  // Weighted average - privilege links weighted higher
  const weighted = links.map((link) => ({
    score: link.score,
    weight: link.linkType === "privilege" ? 1.5 : 1.0,
  }));

  const totalWeight = weighted.reduce((sum, link) => sum + link.weight, 0);
  const weightedSum = weighted.reduce(
    (sum, link) => sum + link.score * link.weight,
    0,
  );

  return Math.round(weightedSum / totalWeight);
}
