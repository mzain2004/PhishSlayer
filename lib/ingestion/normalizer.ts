import { NormalizedLog, CEFEvent } from "../soc/types";

/**
 * Normalizes RFC 5424 / RFC 3164 Syslog
 */
export function normalizeSyslog(raw: string): NormalizedLog {
  // PRI: <(priority)>
  const priMatch = raw.match(/^<(\d+)>/);
  const pri = priMatch ? parseInt(priMatch[1], 10) : 13; // 13 is default notice
  const syslogSeverity = pri % 8;
  
  // Mapping 0-7 to 1-15: (sev * 2) + 1
  const mappedSeverity = (syslogSeverity * 2) + 1;

  // Rough regex for header parts
  const headerRegex = /<(?:\d+)>(\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}(?:\.\d+)?Z|[A-Z][a-z]{2}\s+\d+\s+\d{2}:\d{2}:\d{2})\s+([^\s]+)\s+([^\s\[:]+)(?:\[(\d+)\])?[:\s]+(.*)/;
  const match = raw.match(headerRegex);

  const timestamp = match ? new Date(match[1]) : new Date();
  const hostname = match ? match[2] : null;
  const appName = match ? match[3] : "unknown";
  const message = match ? match[5] : raw;

  return {
    timestamp,
    source_ip: null,
    destination_ip: null,
    user: null,
    hostname,
    action: appName,
    outcome: "unknown",
    severity: mappedSeverity,
    category: "syslog",
    raw_event_id: null,
    mitre_tactic: null,
    mitre_technique: null,
    extra_fields: { pri, message }
  };
}

/**
 * Normalizes CEF (Common Event Format)
 */
export function normalizeCEF(raw: string): NormalizedLog {
  const parts = raw.split("|");
  const header = parts.slice(0, 7);
  const extensionStr = parts.slice(7).join("|");

  const extensions: Record<string, string> = {};
  const kvRegex = /([^=\s]+)=((?:\\=|[^=])+?)(?:\s+|$)(?=[^=\s]+=|$)/g;
  let match;
  while ((match = kvRegex.exec(extensionStr)) !== null) {
    extensions[match[1]] = match[2].trim();
  }

  const cefSeverity = parseInt(header[6], 10) || 0;
  // Map 0-10 to 1-15
  const mappedSeverity = Math.min(Math.round((cefSeverity / 10) * 14) + 1, 15);

  return {
    timestamp: extensions.rt ? new Date(parseInt(extensions.rt)) : new Date(),
    source_ip: extensions.src || null,
    destination_ip: extensions.dst || null,
    user: extensions.suser || extensions.duser || null,
    hostname: extensions.dvchost || null,
    action: extensions.act || header[5] || "unknown",
    outcome: "unknown",
    severity: mappedSeverity,
    category: "cef",
    raw_event_id: header[4] || null,
    mitre_tactic: null,
    mitre_technique: null,
    extra_fields: extensions
  };
}

/**
 * Normalizes LEEF (Log Event Extended Format)
 */
export function normalizeLEEF(raw: string): NormalizedLog {
  const parts = raw.split("|");
  const attributes: Record<string, string> = {};
  
  if (parts.length >= 5) {
    const attrStr = parts.slice(5).join("|");
    const pairs = attrStr.split("\t");
    pairs.forEach(p => {
      const [k, v] = p.split("=");
      if (k && v) attributes[k] = v;
    });
  }

  return {
    timestamp: attributes.devTime ? new Date(attributes.devTime) : new Date(),
    source_ip: attributes.src || null,
    destination_ip: attributes.dst || null,
    user: attributes.usrName || null,
    hostname: attributes.devHost || null,
    action: parts[4] || "unknown",
    outcome: "unknown",
    severity: 5, // Default
    category: "leef",
    raw_event_id: null,
    mitre_tactic: null,
    mitre_technique: null,
    extra_fields: attributes
  };
}

/**
 * Normalizes JSON logs with best-effort mapping
 */
export function normalizeJSON(raw: string): NormalizedLog {
  try {
    const data = JSON.parse(raw);
    const ts = data.timestamp || data.time || data["@timestamp"] || data.eventTime || data.TimeGenerated;
    const sip = data.src || data.source || data.sourceIP || data.source_ip || data.remoteIP;
    const user = data.user || data.username || data.userId || data.actor;

    return {
      timestamp: ts ? new Date(ts) : new Date(),
      source_ip: sip || null,
      destination_ip: data.dst || data.destinationIP || null,
      user: typeof user === 'string' ? user : (user?.name || null),
      hostname: data.hostname || data.host || null,
      action: data.action || data.eventName || "unknown",
      outcome: (data.outcome || data.result || "unknown").toLowerCase() as any,
      severity: data.severity || data.level || 5,
      category: data.category || "json",
      raw_event_id: data.id || data.eventId || null,
      mitre_tactic: data.tactic || null,
      mitre_technique: data.technique || null,
      extra_fields: data
    };
  } catch {
    return normalizeSyslog(raw); // Fallback
  }
}

/**
 * Normalizes AWS CloudTrail
 */
export function normalizeCloudTrail(raw: string): NormalizedLog {
  const data = JSON.parse(raw);
  const isFailure = data.errorCode ? true : false;

  return {
    timestamp: new Date(data.eventTime),
    source_ip: data.sourceIPAddress || null,
    destination_ip: null,
    user: data.userIdentity?.userName || data.userIdentity?.arn || null,
    hostname: data.awsRegion || null,
    action: data.eventName,
    outcome: isFailure ? "failure" : "success",
    severity: isFailure ? 8 : 3,
    category: "cloudtrail",
    raw_event_id: data.eventID,
    mitre_tactic: null,
    mitre_technique: null,
    extra_fields: data
  };
}

/**
 * Normalizes Azure Activity Log
 */
export function normalizeAzureActivity(raw: string): NormalizedLog {
  const data = JSON.parse(raw);
  const isFailure = data.resultType === "Failed";

  return {
    timestamp: new Date(data.eventTimestamp),
    source_ip: data.callerIpAddress || null,
    destination_ip: null,
    user: data.caller || null,
    hostname: data.resourceGroup || null,
    action: data.operationName?.value || "unknown",
    outcome: isFailure ? "failure" : "success",
    severity: isFailure ? 7 : 2,
    category: "azure_activity",
    raw_event_id: data.id,
    mitre_tactic: null,
    mitre_technique: null,
    extra_fields: data
  };
}

/**
 * Auto-detects format and normalizes
 */
export function autoDetectAndNormalize(raw: string): NormalizedLog {
  const trimmed = raw.trim();
  if (trimmed.startsWith("CEF:0")) return normalizeCEF(trimmed);
  if (trimmed.startsWith("LEEF:")) return normalizeLEEF(trimmed);
  
  if (trimmed.startsWith("{")) {
    try {
      const parsed = JSON.parse(trimmed);
      if (parsed.eventSource === "s3.amazonaws.com") return normalizeCloudTrail(trimmed);
      if (parsed.callerIpAddress) return normalizeAzureActivity(trimmed);
      return normalizeJSON(trimmed);
    } catch {
      // Not valid JSON
    }
  }

  return normalizeSyslog(trimmed);
}
