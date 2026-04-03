export interface Anomaly {
  type: string;
  severity: "low" | "medium" | "high" | "critical";
  description: string;
  affectedChainId?: string;
  timestamp: string;
}

export function detectAnomalies(chains: any[]): Anomaly[] {
  const anomalies: Anomaly[] = [];

  for (const chain of chains) {
    // Impossible travel detection
    const signInLinks = chain.links.filter((link: any) => link.type === "signin");

    for (let i = 1; i < signInLinks.length; i++) {
      const prev = signInLinks[i - 1].data;
      const curr = signInLinks[i].data;

      if (prev.location && curr.location) {
        const timeDiffHours =
          Math.abs(
            new Date(curr.timestamp).getTime() -
              new Date(prev.timestamp).getTime(),
          ) /
          (1000 * 60 * 60);

        if (prev.location.country !== curr.location.country && timeDiffHours < 2) {
          anomalies.push({
            type: "impossible_travel",
            severity: "critical",
            description:
              `Sign-in from ${prev.location.country} then ` +
              `${curr.location.country} within ` +
              `${timeDiffHours.toFixed(1)} hours`,
            affectedChainId: chain.chainId,
            timestamp: curr.timestamp,
          });
        }
      }

      // IP change with same session
      if (prev.ipAddress !== curr.ipAddress && prev.compositeKey === curr.compositeKey) {
        anomalies.push({
          type: "ip_change_same_session",
          severity: "high",
          description:
            `IP changed from ${prev.ipAddress} ` +
            `to ${curr.ipAddress} within same session`,
          affectedChainId: chain.chainId,
          timestamp: curr.timestamp,
        });
      }
    }

    // Privilege escalation after high-risk sign-in
    const hasHighRiskSignIn = chain.links.some(
      (link: any) => link.type === "signin" && link.data.riskLevel === "high",
    );
    const hasPrivilegeEscalation = chain.links.some(
      (link: any) => link.type === "privilege",
    );

    if (hasHighRiskSignIn && hasPrivilegeEscalation) {
      anomalies.push({
        type: "privilege_after_risky_signin",
        severity: "critical",
        description:
          "Privilege escalation detected after high-risk sign-in event",
        affectedChainId: chain.chainId,
        timestamp: chain.startTime,
      });
    }

    // Orphaned privilege (no matching sign-in)
    const orphanedPrivileges = chain.links.filter(
      (link: any) => link.type === "privilege" && !link.linkedToCompositeKey,
    );

    if (orphanedPrivileges.length > 0) {
      anomalies.push({
        type: "orphaned_privilege",
        severity: "medium",
        description:
          `${orphanedPrivileges.length} privilege event(s) ` +
          "with no matching sign-in session",
        affectedChainId: chain.chainId,
        timestamp: orphanedPrivileges[0].data.timestamp,
      });
    }
  }

  return anomalies.sort((a, b) => {
    const order = { critical: 0, high: 1, medium: 2, low: 3 };
    return order[a.severity] - order[b.severity];
  });
}
