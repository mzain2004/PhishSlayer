import { performance } from "perf_hooks";
import type { MCPTool } from "@/lib/mcp-tools";

export type IntegrationTestResult = {
  success: boolean;
  latencyMs: number;
};

type TestRequest = {
  url: string;
  init?: RequestInit;
};

function buildUrl(value: string, fallbackPath = "/") {
  const trimmed = value.trim();
  if (!trimmed) {
    return null;
  }

  try {
    return new URL(trimmed).toString();
  } catch {
    return new URL(
      fallbackPath,
      trimmed.endsWith("/") ? trimmed : `${trimmed}/`,
    ).toString();
  }
}

function getConfigValue(config: Record<string, unknown>, key: string) {
  const value = config[key];
  return typeof value === "string" ? value.trim() : "";
}

function buildTestRequest(
  tool: MCPTool,
  apiKey: string,
  config: Record<string, unknown>,
): TestRequest {
  const baseUrl =
    getConfigValue(config, "base_url") || getConfigValue(config, "url");

  switch (tool.id) {
    case "virustotal":
      return {
        url: "https://www.virustotal.com/api/v3/ip_addresses/8.8.8.8",
        init: {
          headers: {
            "x-apikey": apiKey,
            accept: "application/json",
          },
        },
      };
    case "shodan":
      return {
        url: `https://api.shodan.io/shodan/host/8.8.8.8?key=${encodeURIComponent(apiKey)}`,
      };
    case "abuseipdb":
      return {
        url: "https://api.abuseipdb.com/api/v2/check?ipAddress=8.8.8.8&maxAgeInDays=1",
        init: {
          headers: {
            Key: apiKey,
            Accept: "application/json",
          },
        },
      };
    case "greynoise":
      return {
        url: "https://api.greynoise.io/v3/community/8.8.8.8",
        init: {
          headers: {
            key: apiKey,
            accept: "application/json",
          },
        },
      };
    case "otx":
      return {
        url: "https://otx.alienvault.com/api/v1/indicators/IPv4/8.8.8.8/general",
        init: {
          headers: {
            "X-OTX-API-KEY": apiKey,
            accept: "application/json",
          },
        },
      };
    case "urlscan":
      return {
        url: "https://urlscan.io/api/v1/search/?q=example.com",
        init: {
          headers: {
            "API-Key": apiKey,
            accept: "application/json",
          },
        },
      };
    case "passivedns":
      return {
        url: "https://api.securitytrails.com/v1/history/example.com/dns",
        init: {
          headers: {
            APIKEY: apiKey,
            accept: "application/json",
          },
        },
      };
    case "misp":
      return {
        url: buildUrl(baseUrl || tool.docsUrl, "/servers/getVersion")!,
        init: {
          headers: {
            Authorization: apiKey,
            Accept: "application/json",
          },
        },
      };
    case "opencti":
      return {
        url: buildUrl(baseUrl || tool.docsUrl, "/graphql")!,
        init: {
          method: "POST",
          headers: {
            Authorization: `Bearer ${apiKey}`,
            "Content-Type": "application/json",
          },
          body: JSON.stringify({ query: "query { version }" }),
        },
      };
    case "censys":
      return {
        url: "https://search.censys.io/api/v2/hosts/8.8.8.8",
        init: {
          headers: {
            Authorization: `Bearer ${apiKey}`,
            accept: "application/json",
          },
        },
      };
    case "hunter":
      return {
        url: `https://api.hunter.io/v2/account?api_key=${encodeURIComponent(apiKey)}`,
      };
    case "hibp":
      return {
        url: "https://haveibeenpwned.com/api/v3/breachedaccount/test@example.com",
        init: {
          headers: {
            "hibp-api-key": apiKey,
            "user-agent": "PhishSlayer MCP Marketplace",
            accept: "application/json",
          },
        },
      };
    case "crtsh":
      return {
        url: "https://crt.sh/?q=example.com&output=json",
      };
    case "whois":
      return {
        url: "https://rdap.org/domain/example.com",
      };
    case "slack":
      return {
        url: "https://slack.com/api/auth.test",
        init: {
          method: "POST",
          headers: {
            Authorization: `Bearer ${apiKey}`,
            "Content-Type": "application/json",
          },
          body: "{}",
        },
      };
    case "resend":
      return {
        url: "https://api.resend.com/domains",
        init: {
          headers: {
            Authorization: `Bearer ${apiKey}`,
          },
        },
      };
    case "cloudflare_audit":
      return {
        url: "https://api.cloudflare.com/client/v4/user/tokens/verify",
        init: {
          headers: {
            Authorization: `Bearer ${apiKey}`,
          },
        },
      };
    case "grafana":
      return {
        url: buildUrl(baseUrl || tool.docsUrl, "/api/health")!,
        init: {
          headers: {
            Authorization: `Bearer ${apiKey}`,
            accept: "application/json",
          },
        },
      };
    case "sentry":
      return {
        url: buildUrl(baseUrl || tool.docsUrl, "/api/0/")!,
        init: {
          headers: {
            Authorization: `Bearer ${apiKey}`,
            accept: "application/json",
          },
        },
      };
    case "nist_nvd":
      return {
        url: "https://services.nvd.nist.gov/rest/json/cves/2.0?resultsPerPage=1",
      };
    default:
      return {
        url:
          tool.requiresUrl && baseUrl ? buildUrl(baseUrl, "/")! : tool.docsUrl,
        init: { method: "HEAD" },
      };
  }
}

export async function testMcpIntegration(
  tool: MCPTool,
  apiKey: string,
  config: Record<string, unknown>,
): Promise<IntegrationTestResult> {
  const startedAt = performance.now();
  const request = buildTestRequest(tool, apiKey, config);

  try {
    const response = await fetch(request.url, {
      method: request.init?.method ?? "GET",
      headers: request.init?.headers,
      body: request.init?.body,
      redirect: "follow",
    });

    return {
      success: response.ok,
      latencyMs: Math.max(0, Math.round(performance.now() - startedAt)),
    };
  } catch {
    return {
      success: false,
      latencyMs: Math.max(0, Math.round(performance.now() - startedAt)),
    };
  }
}
