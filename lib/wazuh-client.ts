import https from "https";

type TokenCache = {
  token: string;
  expiresAtMs: number;
};

const TOKEN_TTL_MS = 900 * 1000;
const TOKEN_REFRESH_SKEW_MS = 30 * 1000;

let tokenCache: TokenCache | null = null;
let inFlightTokenRequest: Promise<string> | null = null;

function decodeTokenFromResponse(rawBody: string): string {
  const trimmed = rawBody.trim();

  if (!trimmed) {
    throw new Error("Wazuh auth returned empty response");
  }

  // /security/user/authenticate can return either raw token text or a JSON payload.
  if (!trimmed.startsWith("{")) {
    return trimmed.replace(/^"|"$/g, "");
  }

  let parsed: unknown;
  try {
    parsed = JSON.parse(trimmed);
  } catch {
    throw new Error("Wazuh auth returned malformed JSON");
  }

  const tokenFromData =
    typeof parsed === "object" &&
    parsed !== null &&
    "data" in parsed &&
    typeof (parsed as { data?: unknown }).data === "object" &&
    (parsed as { data?: { token?: unknown } }).data !== null
      ? (parsed as { data?: { token?: unknown } }).data?.token
      : undefined;

  const tokenFromRoot =
    typeof parsed === "object" && parsed !== null && "token" in parsed
      ? (parsed as { token?: unknown }).token
      : undefined;

  const token =
    typeof tokenFromData === "string"
      ? tokenFromData
      : typeof tokenFromRoot === "string"
        ? tokenFromRoot
        : null;

  if (!token) {
    throw new Error("Wazuh auth token missing in response");
  }

  return token;
}

async function requestFreshToken(
  managerIp: string,
  password: string,
): Promise<string> {
  return new Promise((resolve, reject) => {
    const basicAuth = Buffer.from(`wazuh:${password}`).toString("base64");

    const req = https.request(
      {
        hostname: managerIp,
        port: 55000,
        path: "/security/user/authenticate",
        method: "POST",
        rejectUnauthorized: false,
        headers: {
          Authorization: `Basic ${basicAuth}`,
        },
      },
      (res) => {
        let body = "";

        res.on("data", (chunk: Buffer) => {
          body += chunk.toString();
        });

        res.on("end", () => {
          if (
            !res.statusCode ||
            res.statusCode < 200 ||
            res.statusCode >= 300
          ) {
            reject(
              new Error(
                `Wazuh authenticate failed with status ${res.statusCode || 0}`,
              ),
            );
            return;
          }

          try {
            const token = decodeTokenFromResponse(body);
            resolve(token);
          } catch (error) {
            reject(error);
          }
        });
      },
    );

    req.on("error", (error) => reject(error));
    req.end();
  });
}

function isCacheValid(nowMs: number): boolean {
  return Boolean(
    tokenCache && nowMs + TOKEN_REFRESH_SKEW_MS < tokenCache.expiresAtMs,
  );
}

export async function getWazuhApiToken(forceRefresh = false): Promise<string> {
  const managerIp = process.env.WAZUH_MANAGER_IP;
  const password = process.env.WAZUH_API_PASSWORD;

  if (!managerIp) {
    throw new Error("Missing WAZUH_MANAGER_IP");
  }

  if (!password) {
    throw new Error("Missing WAZUH_API_PASSWORD");
  }

  const nowMs = Date.now();
  if (!forceRefresh && isCacheValid(nowMs) && tokenCache) {
    return tokenCache.token;
  }

  if (!forceRefresh && inFlightTokenRequest) {
    return inFlightTokenRequest;
  }

  inFlightTokenRequest = requestFreshToken(managerIp, password)
    .then((token) => {
      tokenCache = {
        token,
        expiresAtMs: Date.now() + TOKEN_TTL_MS,
      };
      return token;
    })
    .finally(() => {
      inFlightTokenRequest = null;
    });

  return inFlightTokenRequest;
}
