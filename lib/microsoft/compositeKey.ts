// Scott's insight: CorrelationId breaks across token
// refresh and app boundaries - use composite fallback

export function buildCompositeKey(params: {
  userId?: string;
  deviceId?: string;
  ipAddress?: string;
  timestamp: string;
  correlationId?: string;
  sessionId?: string;
}): string {
  const timeWindow = Math.floor(
    new Date(params.timestamp).getTime() / (5 * 60 * 1000),
  ); // 5-minute windows

  // Primary: use correlationId if available
  if (params.correlationId && params.userId) {
    return `${params.userId}:${params.correlationId}:${timeWindow}`;
  }

  // Fallback 1: user + device + time window
  if (params.userId && params.deviceId) {
    return `${params.userId}:${params.deviceId}:${timeWindow}`;
  }

  // Fallback 2: user + IP + time window
  if (params.userId && params.ipAddress) {
    return `${params.userId}:${params.ipAddress}:${timeWindow}`;
  }

  // Fallback 3: sessionId + time window
  if (params.sessionId) {
    return `${params.sessionId}:${timeWindow}`;
  }

  // Last resort: generate deterministic key
  return `unknown:${timeWindow}:${Math.random().toString(36).slice(2)}`;
}

export function calculateDeviceConfidence(params: {
  isCompliant?: boolean;
  trustType?: string;
  lastCheckTime?: string;
  mdeDataAvailable?: boolean;
}): number {
  let score = 50; // base score

  if (params.isCompliant === true) score += 20;
  if (params.isCompliant === false) score -= 30;

  if (params.trustType === "AzureAD") score += 15;
  if (params.trustType === "Hybrid") score += 10;
  if (params.trustType === "Personal") score -= 10;

  // Compliance check staleness penalty
  if (params.lastCheckTime) {
    const hoursAgo =
      (Date.now() - new Date(params.lastCheckTime).getTime()) /
      (1000 * 60 * 60);
    if (hoursAgo > 4) score -= 10;
    if (hoursAgo > 24) score -= 20;
  }

  if (params.mdeDataAvailable) score += 15;

  return Math.max(0, Math.min(100, score));
}
