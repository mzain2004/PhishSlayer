import { RawAlert, DeduplicatedCase } from "./types";
import { v4 as uuidv4 } from "uuid";

/**
 * Deduplicates alerts by grouping them based on source_ip and rule_id 
 * within 15-minute windows.
 */
export function deduplicateAlerts(alerts: RawAlert[]): DeduplicatedCase[] {
  if (alerts.length === 0) return [];

  // Sort alerts by timestamp ascending
  const sortedAlerts = [...alerts].sort((a, b) => 
    new Date(a.created_at).getTime() - new Date(b.created_at).getTime()
  );

  const cases: DeduplicatedCase[] = [];
  const WINDOW_MS = 15 * 60 * 1000;

  // Track active cases per grouping key (source_ip + rule_id)
  const activeCasesMap = new Map<string, DeduplicatedCase>();

  for (const alert of sortedAlerts) {
    const key = `${alert.source_ip}|${alert.rule_id}`;
    const existingCase = activeCasesMap.get(key);
    const alertTime = new Date(alert.created_at).getTime();

    if (existingCase && (alertTime - new Date(existingCase.first_seen).getTime()) <= WINDOW_MS) {
      // Add to existing case window
      existingCase.alerts.push(alert);
      existingCase.count++;
      existingCase.last_seen = alert.created_at;
      // Optionally update representative alert if needed (e.g., higher severity)
      // Here we keep the first one as representative or update to the latest
      existingCase.representative_alert = alert; 
    } else {
      // Create a new case
      const newCase: DeduplicatedCase = {
        id: uuidv4(),
        alerts: [alert],
        count: 1,
        first_seen: alert.created_at,
        last_seen: alert.created_at,
        representative_alert: alert
      };
      cases.push(newCase);
      activeCasesMap.set(key, newCase);
    }
  }

  return cases;
}
