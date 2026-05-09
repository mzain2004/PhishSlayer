export type LogLevel = "debug" | "info" | "warn" | "error";

export interface LogEntry {
  timestamp: string;
  level: LogLevel;
  request_id: string;
  user_id: string | null;
  org_id: string | null;
  route: string;
  event: string;
  duration_ms?: number;
  alert_id?: string;
  agent_level?: string;
  error_code?: string;
  metadata?: Record<string, unknown>;
}

function buildEntry(
  level: LogLevel,
  event: string,
  context: Partial<LogEntry>,
): LogEntry {
  return {
    timestamp: new Date().toISOString(),
    level,
    request_id: context.request_id ?? crypto.randomUUID(),
    user_id: context.user_id ?? null,
    org_id: context.org_id ?? null,
    route: context.route ?? "unknown",
    event,
    ...context,
  };
}

export const logger = {
  info: (event: string, ctx?: Partial<LogEntry>) =>
    console.log(JSON.stringify(buildEntry("info", event, ctx ?? {}))),
  warn: (event: string, ctx?: Partial<LogEntry>) =>
    console.warn(JSON.stringify(buildEntry("warn", event, ctx ?? {}))),
  error: (event: string, ctx?: Partial<LogEntry>) =>
    console.error(JSON.stringify(buildEntry("error", event, ctx ?? {}))),
  debug: (event: string, ctx?: Partial<LogEntry>) =>
    process.env.NODE_ENV !== "production" &&
    console.debug(JSON.stringify(buildEntry("debug", event, ctx ?? {}))),
};
