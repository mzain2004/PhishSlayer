export type MCPToolCategory =
  | "THREAT_INTEL"
  | "OSINT"
  | "COMMUNICATION"
  | "CLOUD"
  | "VULNERABILITY";

export type MCPToolTier = "free" | "pro" | "all";

export type MCPToolConfigField = {
  key: string;
  label: string;
  placeholder: string;
  helperText?: string;
  required?: boolean;
  type?: "text" | "password" | "url";
};

export type MCPTool = {
  id: string;
  name: string;
  description: string;
  category: MCPToolCategory;
  docsUrl: string;
  apiKeyUrl: string;
  requiresUrl: boolean;
  tier: MCPToolTier;
  emoji: string;
  configFields: MCPToolConfigField[];
};

export type OrgIntegrationStatus =
  | "connected"
  | "using_shared"
  | "not_connected";

export type OrgPlanTier = "free" | "soc_pro" | "command_center";

export type MarketplaceTool = MCPTool & {
  status: OrgIntegrationStatus;
  connected: boolean;
  connectedAt: string | null;
  config: Record<string, unknown> | null;
  shared: boolean;
};

export const MCP_TOOL_CATEGORIES: Array<{
  id: MCPToolCategory;
  label: string;
  description: string;
}> = [
  {
    id: "THREAT_INTEL",
    label: "Threat Intel",
    description: "IOC enrichment, malware intel, and reputation sources.",
  },
  {
    id: "OSINT",
    label: "OSINT",
    description: "Identity, domain, and exposure reconnaissance.",
  },
  {
    id: "COMMUNICATION",
    label: "Communication",
    description: "Alert delivery, ticketing, and response notifications.",
  },
  {
    id: "CLOUD",
    label: "Cloud",
    description: "Cloud and observability telemetry connectors.",
  },
  {
    id: "VULNERABILITY",
    label: "Vulnerability",
    description: "Vuln intelligence and scanning integrations.",
  },
];

const SHARED_DOCS = "https://docs.phishslayer.tech/docs/integrations";

const TOOL_REGISTRY: MCPTool[] = [
  {
    id: "virustotal",
    name: "VirusTotal",
    description: "Malware, URL, and file reputation enrichment.",
    category: "THREAT_INTEL",
    docsUrl: "https://docs.virustotal.com/reference/overview",
    apiKeyUrl: "https://www.virustotal.com/gui/user",
    requiresUrl: false,
    tier: "free",
    emoji: "🦠",
    configFields: [],
  },
  {
    id: "shodan",
    name: "Shodan",
    description: "Internet-exposed asset discovery and host intelligence.",
    category: "THREAT_INTEL",
    docsUrl: "https://developer.shodan.io/",
    apiKeyUrl: "https://account.shodan.io/",
    requiresUrl: false,
    tier: "free",
    emoji: "🔭",
    configFields: [],
  },
  {
    id: "abuseipdb",
    name: "AbuseIPDB",
    description: "IP abuse reputation and reporting lookups.",
    category: "THREAT_INTEL",
    docsUrl: "https://docs.abuseipdb.com/",
    apiKeyUrl: "https://www.abuseipdb.com/account/api",
    requiresUrl: false,
    tier: "free",
    emoji: "🚫",
    configFields: [],
  },
  {
    id: "greynoise",
    name: "GreyNoise",
    description: "Background noise classification and IP context.",
    category: "THREAT_INTEL",
    docsUrl: "https://docs.greynoise.io/",
    apiKeyUrl: "https://viz.greynoise.io/signup",
    requiresUrl: false,
    tier: "pro",
    emoji: "🌫️",
    configFields: [],
  },
  {
    id: "otx",
    name: "AlienVault OTX",
    description: "Threat exchange pulses and indicator context.",
    category: "THREAT_INTEL",
    docsUrl: "https://otx.alienvault.com/api",
    apiKeyUrl: "https://otx.alienvault.com/",
    requiresUrl: false,
    tier: "free",
    emoji: "👽",
    configFields: [],
  },
  {
    id: "urlscan",
    name: "urlscan.io",
    description: "URL analysis and search across scanned pages.",
    category: "THREAT_INTEL",
    docsUrl: "https://urlscan.io/docs/api/",
    apiKeyUrl: "https://urlscan.io/user/profile/",
    requiresUrl: false,
    tier: "free",
    emoji: "🔎",
    configFields: [],
  },
  {
    id: "urlhaus",
    name: "URLhaus",
    description: "Malicious URL and payload sharing database.",
    category: "THREAT_INTEL",
    docsUrl: "https://urlhaus-api.abuse.ch/",
    apiKeyUrl: "https://urlhaus.abuse.ch/api/",
    requiresUrl: false,
    tier: "all",
    emoji: "🕸️",
    configFields: [],
  },
  {
    id: "threatfox",
    name: "ThreatFox",
    description: "IOC sharing and malware campaign intelligence.",
    category: "THREAT_INTEL",
    docsUrl: "https://threatfox-api.abuse.ch/",
    apiKeyUrl: "https://threatfox.abuse.ch/api/",
    requiresUrl: false,
    tier: "all",
    emoji: "🦊",
    configFields: [],
  },
  {
    id: "malwarebazaar",
    name: "MalwareBazaar",
    description: "Malware sample and hash repository lookups.",
    category: "THREAT_INTEL",
    docsUrl: "https://bazaar.abuse.ch/api/",
    apiKeyUrl: "https://bazaar.abuse.ch/",
    requiresUrl: false,
    tier: "all",
    emoji: "🧪",
    configFields: [],
  },
  {
    id: "passivedns",
    name: "PassiveDNS",
    description: "Historical DNS resolution and pivoting data.",
    category: "THREAT_INTEL",
    docsUrl: "https://docs.securitytrails.com/docs/intro",
    apiKeyUrl: "https://securitytrails.com/app/account/api",
    requiresUrl: false,
    tier: "pro",
    emoji: "🌐",
    configFields: [],
  },
  {
    id: "misp",
    name: "MISP",
    description: "Threat intelligence sharing and event correlation.",
    category: "THREAT_INTEL",
    docsUrl: "https://www.misp-project.org/documentation/",
    apiKeyUrl: "https://www.misp-project.org/",
    requiresUrl: true,
    tier: "pro",
    emoji: "🧩",
    configFields: [
      {
        key: "base_url",
        label: "MISP Base URL",
        placeholder: "https://misp.example.com",
        type: "url",
        required: true,
        helperText: "Your self-hosted MISP instance URL.",
      },
    ],
  },
  {
    id: "opencti",
    name: "OpenCTI",
    description: "Graph-based cyber threat intelligence platform.",
    category: "THREAT_INTEL",
    docsUrl: "https://docs.opencti.io/latest/",
    apiKeyUrl: "https://docs.opencti.io/latest/deployment/initialization/",
    requiresUrl: true,
    tier: "pro",
    emoji: "🧠",
    configFields: [
      {
        key: "base_url",
        label: "OpenCTI Base URL",
        placeholder: "https://opencti.example.com",
        type: "url",
        required: true,
        helperText: "Your OpenCTI instance URL.",
      },
    ],
  },
  {
    id: "censys",
    name: "Censys",
    description: "Internet-wide asset and certificate intelligence.",
    category: "THREAT_INTEL",
    docsUrl: "https://docs.censys.com/",
    apiKeyUrl: "https://search.censys.io/account/api",
    requiresUrl: false,
    tier: "pro",
    emoji: "🛰️",
    configFields: [],
  },
  {
    id: "hunter",
    name: "Hunter.io",
    description: "Email pattern discovery and verification.",
    category: "OSINT",
    docsUrl: "https://hunter.io/api-documentation",
    apiKeyUrl: "https://hunter.io/api-keys",
    requiresUrl: false,
    tier: "free",
    emoji: "📧",
    configFields: [],
  },
  {
    id: "hibp",
    name: "Have I Been Pwned",
    description: "Breached account and password exposure checks.",
    category: "OSINT",
    docsUrl: "https://haveibeenpwned.com/API/v3",
    apiKeyUrl: "https://haveibeenpwned.com/API/Key",
    requiresUrl: false,
    tier: "free",
    emoji: "🔓",
    configFields: [],
  },
  {
    id: "crtsh",
    name: "crt.sh",
    description: "Certificate transparency search for domains.",
    category: "OSINT",
    docsUrl: "https://crt.sh/",
    apiKeyUrl: SHARED_DOCS,
    requiresUrl: false,
    tier: "all",
    emoji: "📜",
    configFields: [],
  },
  {
    id: "whois",
    name: "WHOIS / RDAP",
    description: "Domain registration and registrar context.",
    category: "OSINT",
    docsUrl: "https://www.icann.org/resources/pages/rdap-2014-02-18-en",
    apiKeyUrl: SHARED_DOCS,
    requiresUrl: false,
    tier: "all",
    emoji: "🪪",
    configFields: [],
  },
  {
    id: "slack",
    name: "Slack",
    description: "Alert notifications and analyst collaboration.",
    category: "COMMUNICATION",
    docsUrl: "https://api.slack.com/web",
    apiKeyUrl: "https://api.slack.com/apps",
    requiresUrl: false,
    tier: "free",
    emoji: "💬",
    configFields: [],
  },
  {
    id: "resend",
    name: "Resend",
    description: "Transactional email delivery for reports and alerts.",
    category: "COMMUNICATION",
    docsUrl: "https://resend.com/docs/api-reference",
    apiKeyUrl: "https://resend.com/api-keys",
    requiresUrl: false,
    tier: "free",
    emoji: "✉️",
    configFields: [],
  },
  {
    id: "aws_cloudtrail",
    name: "AWS CloudTrail",
    description: "Cloud audit logs and activity monitoring.",
    category: "CLOUD",
    docsUrl:
      "https://docs.aws.amazon.com/awscloudtrail/latest/APIReference/Welcome.html",
    apiKeyUrl: "https://console.aws.amazon.com/iam/home#/security_credentials",
    requiresUrl: false,
    tier: "pro",
    emoji: "☁️",
    configFields: [],
  },
  {
    id: "aws_cloudwatch",
    name: "AWS CloudWatch",
    description: "Metrics, logs, and alarms from AWS workloads.",
    category: "CLOUD",
    docsUrl:
      "https://docs.aws.amazon.com/AmazonCloudWatch/latest/APIReference/Welcome.html",
    apiKeyUrl: "https://console.aws.amazon.com/iam/home#/security_credentials",
    requiresUrl: false,
    tier: "pro",
    emoji: "📈",
    configFields: [],
  },
  {
    id: "aws_iam",
    name: "AWS IAM",
    description: "Identity, policy, and credential activity monitoring.",
    category: "CLOUD",
    docsUrl: "https://docs.aws.amazon.com/IAM/latest/APIReference/Welcome.html",
    apiKeyUrl: "https://console.aws.amazon.com/iam/home#/security_credentials",
    requiresUrl: false,
    tier: "pro",
    emoji: "🔐",
    configFields: [],
  },
  {
    id: "cloudflare_audit",
    name: "Cloudflare Audit Logs",
    description: "Edge, DNS, and access audit telemetry.",
    category: "CLOUD",
    docsUrl: "https://developers.cloudflare.com/api/",
    apiKeyUrl: "https://dash.cloudflare.com/profile/api-tokens",
    requiresUrl: false,
    tier: "pro",
    emoji: "🛡️",
    configFields: [],
  },
  {
    id: "grafana",
    name: "Grafana",
    description: "Observability dashboards and alerting data.",
    category: "CLOUD",
    docsUrl: "https://grafana.com/docs/grafana/latest/developers/http_api/",
    apiKeyUrl: "https://grafana.com/auth/sign-in/",
    requiresUrl: true,
    tier: "pro",
    emoji: "📊",
    configFields: [
      {
        key: "base_url",
        label: "Grafana Base URL",
        placeholder: "https://grafana.example.com",
        type: "url",
        required: true,
        helperText: "The URL of your Grafana instance.",
      },
    ],
  },
  {
    id: "sentry",
    name: "Sentry",
    description: "Application and service error telemetry.",
    category: "CLOUD",
    docsUrl: "https://docs.sentry.io/api/",
    apiKeyUrl: "https://sentry.io/settings/account/api/auth-tokens/",
    requiresUrl: true,
    tier: "pro",
    emoji: "🚨",
    configFields: [
      {
        key: "base_url",
        label: "Sentry Base URL",
        placeholder: "https://sentry.io",
        type: "url",
        required: true,
        helperText: "Your Sentry organization or self-hosted URL.",
      },
    ],
  },
  {
    id: "semgrep",
    name: "Semgrep",
    description: "Code scanning and application security findings.",
    category: "VULNERABILITY",
    docsUrl: "https://semgrep.dev/docs/api/",
    apiKeyUrl: "https://semgrep.dev/login",
    requiresUrl: false,
    tier: "free",
    emoji: "🧪",
    configFields: [],
  },
  {
    id: "nist_nvd",
    name: "NIST NVD",
    description: "National vulnerability database lookups.",
    category: "VULNERABILITY",
    docsUrl: "https://nvd.nist.gov/developers",
    apiKeyUrl: SHARED_DOCS,
    requiresUrl: false,
    tier: "all",
    emoji: "📚",
    configFields: [],
  },
  {
    id: "bright_data",
    name: "Bright Data",
    description: "Proxy, scraping, and web data intelligence.",
    category: "VULNERABILITY",
    docsUrl: "https://docs.brightdata.com/",
    apiKeyUrl: "https://brightdata.com/cp/keys",
    requiresUrl: false,
    tier: "pro",
    emoji: "💡",
    configFields: [],
  },
];

export function getMcpTools() {
  return TOOL_REGISTRY;
}

export function getMcpToolById(toolId: string) {
  return TOOL_REGISTRY.find((tool) => tool.id === toolId);
}

export function getMcpToolsByCategory(category: MCPToolCategory) {
  return TOOL_REGISTRY.filter((tool) => tool.category === category);
}

export function getToolCategoryLabel(category: MCPToolCategory) {
  return (
    MCP_TOOL_CATEGORIES.find((item) => item.id === category)?.label ?? category
  );
}

export function getToolStatusLabel(status: OrgIntegrationStatus) {
  switch (status) {
    case "connected":
      return "Connected";
    case "using_shared":
      return "Using Shared";
    case "not_connected":
      return "Not Connected";
  }
}

export function getOrgPlanLabel(tier: OrgPlanTier | string | null | undefined) {
  if (!tier) return "Free";
  if (tier === "soc_pro" || tier === "pro") return "SOC Pro";
  if (tier === "command_center" || tier === "enterprise")
    return "Command Center";
  return "Free";
}

export function hasProToolAccess(
  tier: OrgPlanTier | string | null | undefined,
) {
  return (
    tier === "soc_pro" ||
    tier === "command_center" ||
    tier === "pro" ||
    tier === "enterprise"
  );
}
