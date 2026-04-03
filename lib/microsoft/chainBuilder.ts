import type {
  IdentityChain,
  IdentityChainLink,
  PrivilegeEvent,
  SignInEvent,
} from "./types";
import { calculateDecayAdjustedChainScore } from "./confidenceDecay";
import { calculateWeightedConfidence, extractSignals } from "./edgeWeights";
import { explainChainConfidence } from "./explainability";

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
    let strongestWeightedScore = 0;
    let strongestMissingSignals: string[] = [];
    let strongestBreakdown: Record<string, number> = {};
    let strongestRiskLevel = "none";
    let strongestMfaMethod: string | undefined;
    let strongestDeviceComplianceScore: number | undefined;
    let strongestConditionalAccessStatus: string | undefined;

    // Add sign-in links
    for (const signIn of actorSignIns) {
      const signals = extractSignals(signIn);
      const weighted = calculateWeightedConfidence(signals);

      // Penalize missing strong signals to avoid inflated confidence.
      const confidence = Math.max(
        0,
        weighted.weightedScore -
          Math.min(10, weighted.missingSignals.length * 2),
      );

      if (confidence >= strongestWeightedScore) {
        strongestWeightedScore = weighted.weightedScore;
        strongestMissingSignals = weighted.missingSignals;
        strongestBreakdown = weighted.breakdown;
        strongestRiskLevel = signIn.riskLevel;
        strongestMfaMethod = signIn.mfaMethod;
        strongestDeviceComplianceScore = signIn.deviceComplianceScore;
        strongestConditionalAccessStatus = signIn.conditionalAccessStatus;
      }

      links.push({
        type: "signin",
        data: signIn,
        confidenceScore: confidence,
        linkedToCompositeKey: signIn.compositeKey,
      });
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
    }

    const sortedLinks = links.sort((a, b) =>
      extractTimestamp(a.data).localeCompare(extractTimestamp(b.data)),
    );

    const decayResult = calculateDecayAdjustedChainScore(
      sortedLinks.map((link) => ({
        confidenceScore: link.confidenceScore,
        timestamp: extractTimestamp(link.data),
        type: link.type,
      })),
    );

    const overallConfidence = decayResult.adjustedScore;
    const explanation = explainChainConfidence({
      weightedScore: strongestWeightedScore,
      decayedScore: overallConfidence,
      decayImpact: decayResult.decayImpact,
      staleLinks: decayResult.staleLinks,
      missingSignals: strongestMissingSignals,
      breakdown: strongestBreakdown,
      riskLevel: strongestRiskLevel,
      mfaMethod: strongestMfaMethod,
      deviceComplianceScore: strongestDeviceComplianceScore,
      conditionalAccessStatus: strongestConditionalAccessStatus,
    });

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
      staleLinks: decayResult.staleLinks,
      decayImpact: decayResult.decayImpact,
      // Scott's insight: design for partial graphs
      isPartialGraph: overallConfidence < 70,
      verdict: generateVerdict(overallConfidence, links),
      explanation,
    });
  }

  return chains.sort((a, b) => b.overallConfidence - a.overallConfidence);
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
