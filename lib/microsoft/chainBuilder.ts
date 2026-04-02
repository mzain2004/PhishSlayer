import type {
  IdentityChain,
  IdentityChainLink,
  PrivilegeEvent,
  SignInEvent,
} from "./types";

export function buildIdentityChain(
  signIns: SignInEvent[],
  privileges: PrivilegeEvent[],
): IdentityChain[] {
  const chains: IdentityChain[] = [];
  const actorGroups = new Map<string, SignInEvent[]>();

  // Group sign-ins by actor ID
  for (const signIn of signIns) {
    const key = signIn.actorId;
    if (!actorGroups.has(key)) actorGroups.set(key, []);
    actorGroups.get(key)!.push(signIn);
  }

  for (const [actorId, actorSignIns] of actorGroups) {
    const links: IdentityChainLink[] = [];
    let totalConfidence = 0;

    // Add sign-in links
    for (const signIn of actorSignIns) {
      const confidence = calculateLinkConfidence(signIn);
      links.push({
        type: "signin",
        data: signIn,
        confidenceScore: confidence,
        linkedToCompositeKey: signIn.compositeKey,
      });
      totalConfidence += confidence;
    }

    // Match privilege events to sign-ins
    const actorPrivileges = privileges.filter((p) => p.actorId === actorId);

    for (const privilege of actorPrivileges) {
      // Find matching sign-in within time window
      const matchingSignIn = actorSignIns.find((signIn) => {
        const timeDiff = Math.abs(
          new Date(privilege.timestamp).getTime() -
            new Date(signIn.timestamp).getTime(),
        );
        return timeDiff < 30 * 60 * 1000; // 30 min window
      });

      const confidence = matchingSignIn ? 85 : 40;
      links.push({
        type: "privilege",
        data: privilege,
        confidenceScore: confidence,
        linkedToCompositeKey: matchingSignIn?.compositeKey,
      });
      totalConfidence += confidence;
    }

    const overallConfidence =
      links.length > 0 ? Math.round(totalConfidence / links.length) : 0;

    const sortedLinks = links.sort(
      (a, b) =>
        extractTimestamp(a.data).localeCompare(extractTimestamp(b.data)),
    );

    chains.push({
      chainId: `chain-${actorId}-${Date.now()}`,
      actorId,
      actorType: actorSignIns[0]?.actorType || "user",
      startTime: sortedLinks[0] ? extractTimestamp(sortedLinks[0].data) : "",
      endTime: sortedLinks[sortedLinks.length - 1]
        ? extractTimestamp(sortedLinks[sortedLinks.length - 1].data)
        : "",
      links: sortedLinks,
      overallConfidence,
      // Scott's insight: design for partial graphs
      isPartialGraph: overallConfidence < 70,
      verdict: generateVerdict(overallConfidence, links),
    });
  }

  return chains.sort((a, b) => b.overallConfidence - a.overallConfidence);
}

function calculateLinkConfidence(signIn: SignInEvent): number {
  let score = 50;

  score += signIn.deviceComplianceScore * 0.3;
  if (signIn.mfaMethod) score += 15;
  if (signIn.riskLevel === "none") score += 10;
  if (signIn.riskLevel === "high") score -= 30;
  if (signIn.conditionalAccessStatus === "success") score += 10;
  if (signIn.compositeKey.startsWith("unknown")) score -= 20;

  return Math.max(0, Math.min(100, Math.round(score)));
}

function extractTimestamp(data: IdentityChainLink["data"]): string {
  if ("timestamp" in data && typeof data.timestamp === "string") {
    return data.timestamp;
  }
  return "";
}

function isSignInEvent(data: IdentityChainLink["data"]): data is SignInEvent {
  return (
    "actorType" in data &&
    "riskLevel" in data &&
    typeof data.riskLevel === "string"
  );
}

function generateVerdict(
  confidence: number,
  links: IdentityChainLink[],
): string {
  const hasHighRisk = links.some(
    (link) => isSignInEvent(link.data) && link.data.riskLevel === "high",
  );
  const hasPrivilege = links.some((link) => link.type === "privilege");

  if (hasHighRisk && hasPrivilege) {
    return "HIGH RISK: Privileged action during high-risk session";
  }
  if (hasHighRisk) return "ELEVATED: High-risk sign-in detected";
  if (confidence < 50) return "PARTIAL: Incomplete identity chain";
  if (confidence > 80) return "VERIFIED: Strong identity chain";
  return "MODERATE: Partial identity correlation";
}
