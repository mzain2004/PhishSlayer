const SENSITIVE_KEYS = new Set([
  "password",
  "token",
  "access_token",
  "refresh_token",
  "api_key",
  "apikey",
  "secret",
  "authorization",
  "cookie",
  "set-cookie",
]);

function shouldRedact(key: string): boolean {
  const normalized = key.toLowerCase().replace(/[^a-z0-9_]/g, "");
  return SENSITIVE_KEYS.has(normalized);
}

export function redactSensitive(
  value: Record<string, unknown> | undefined,
): Record<string, unknown> | undefined {
  if (!value) return value;

  const output: Record<string, unknown> = {};
  for (const [key, entry] of Object.entries(value)) {
    if (shouldRedact(key)) {
      output[key] = "[redacted]";
      continue;
    }

    if (entry && typeof entry === "object" && !Array.isArray(entry)) {
      output[key] = redactSensitive(entry as Record<string, unknown>);
      continue;
    }

    output[key] = entry;
  }

  return output;
}
