export async function triggerPagerDutyAlert(
  case_id: string, 
  title: string, 
  severity: string, 
  source: string
): Promise<string | null> {
  const routingKey = process.env.PAGERDUTY_INTEGRATION_KEY;
  if (!routingKey) return null;

  const dedupKey = `phishslayer-${case_id}`;
  const severityMap: Record<string, string> = {
    p1: "critical", p2: "error", p3: "warning", p4: "info"
  };

  try {
    const res = await fetch("https://events.pagerduty.com/v2/enqueue", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        routing_key: routingKey,
        event_action: "trigger",
        dedup_key: dedupKey,
        payload: {
          summary: title,
          severity: severityMap[severity] || "warning",
          source: source || "PhishSlayer SOC",
          component: "PhishSlayer Autonomous SOC"
        }
      })
    });
    if (!res.ok) throw new Error("PagerDuty trigger failed");
    return dedupKey;
  } catch (error) {
    console.error("[pagerduty] Error:", error);
    return null;
  }
}

export async function resolvePagerDutyAlert(dedup_key: string): Promise<void> {
  const routingKey = process.env.PAGERDUTY_INTEGRATION_KEY;
  if (!routingKey || !dedup_key) return;

  try {
    await fetch("https://events.pagerduty.com/v2/enqueue", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          routing_key: routingKey,
          event_action: "resolve",
          dedup_key: dedup_key
        })
    });
  } catch (error) {
    console.error("[pagerduty] Resolve error:", error);
  }
}
