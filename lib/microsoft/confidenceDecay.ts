/**
 * Scott's insight: A session that was high confidence
 * at T0 should not carry the same weight at T+30
 * if context hasn't been revalidated.
 */

export interface DecayConfig {
  halfLifeMinutes: number;
  minimumScore: number;
  revalidationBonus: number;
}

export const DEFAULT_DECAY_CONFIG: DecayConfig = {
  halfLifeMinutes: 30,
  minimumScore: 10,
  revalidationBonus: 20,
};

/**
 * Applies exponential decay to a confidence score
 * based on time elapsed since last validation
 */
export function applyConfidenceDecay(
  initialScore: number,
  lastValidatedAt: string,
  currentTime: string = new Date().toISOString(),
  config: DecayConfig = DEFAULT_DECAY_CONFIG,
): {
  decayedScore: number;
  decayFactor: number;
  minutesElapsed: number;
  isStale: boolean;
} {
  const elapsed =
    Math.abs(
      new Date(currentTime).getTime() - new Date(lastValidatedAt).getTime(),
    ) /
    (1000 * 60);

  // Exponential decay: score * 0.5^(t/halfLife)
  const decayFactor = Math.pow(0.5, elapsed / config.halfLifeMinutes);

  const decayedScore = Math.max(
    config.minimumScore,
    Math.round(initialScore * decayFactor),
  );

  return {
    decayedScore,
    decayFactor: Math.round(decayFactor * 100) / 100,
    minutesElapsed: Math.round(elapsed),
    isStale: elapsed > config.halfLifeMinutes * 2,
  };
}

/**
 * Applies revalidation bonus when new signals
 * confirm an existing session
 */
export function applyRevalidationBonus(
  currentScore: number,
  config: DecayConfig = DEFAULT_DECAY_CONFIG,
): number {
  return Math.min(100, currentScore + config.revalidationBonus);
}

/**
 * Calculates decay-adjusted chain confidence
 * considering all links and their timestamps
 */
export function calculateDecayAdjustedChainScore(
  links: Array<{
    confidenceScore: number;
    timestamp: string;
    type: string;
  }>,
  evaluationTime: string = new Date().toISOString(),
): {
  adjustedScore: number;
  staleLinks: number;
  decayImpact: number;
} {
  if (links.length === 0) {
    return { adjustedScore: 0, staleLinks: 0, decayImpact: 0 };
  }

  let totalOriginal = 0;
  let totalDecayed = 0;
  let staleLinks = 0;

  for (const link of links) {
    const { decayedScore, isStale } = applyConfidenceDecay(
      link.confidenceScore,
      link.timestamp,
      evaluationTime,
    );

    totalOriginal += link.confidenceScore;
    totalDecayed += decayedScore;
    if (isStale) staleLinks++;
  }

  const avgOriginal = Math.round(totalOriginal / links.length);
  const adjustedScore = Math.round(totalDecayed / links.length);

  return {
    adjustedScore,
    staleLinks,
    decayImpact: avgOriginal - adjustedScore,
  };
}
