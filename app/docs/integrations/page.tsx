import type { Metadata } from "next";
import { SUPPORT_EMAIL } from "@/lib/email";
import CodeBlock from "@/components/docs/CodeBlock";

export const metadata: Metadata = {
  title: "Integrations — PhishSlayer Docs",
  description:
    "Connect Microsoft 365, Slack, PagerDuty, Wazuh, and MCP tools to PhishSlayer.",
};

const S = {
  h1: {
    fontSize: 30,
    fontWeight: 700,
    color: "var(--text-primary)",
    letterSpacing: "-0.02em",
    marginBottom: 10,
  } as React.CSSProperties,
  h2: {
    fontSize: 20,
    fontWeight: 600,
    marginTop: 48,
    marginBottom: 16,
    paddingBottom: 10,
    borderBottom: "1px solid var(--bg-border)",
    color: "var(--text-primary)",
  } as React.CSSProperties,
  h3: {
    fontSize: 16,
    fontWeight: 600,
    marginTop: 28,
    marginBottom: 10,
    color: "var(--text-primary)",
  } as React.CSSProperties,
  p: {
    fontSize: 15,
    lineHeight: "1.75",
    color: "var(--text-secondary)",
    marginBottom: 16,
  } as React.CSSProperties,
  ul: { paddingLeft: 20, marginBottom: 16 } as React.CSSProperties,
  li: {
    fontSize: 15,
    lineHeight: "1.75",
    color: "var(--text-secondary)",
    marginBottom: 6,
  } as React.CSSProperties,
  note: {
    background: "rgba(124,92,255,0.08)",
    border: "1px solid rgba(124,92,255,0.25)",
    borderRadius: 8,
    padding: "12px 16px",
    marginBottom: 20,
  } as React.CSSProperties,
  noteLabel: {
    fontSize: 11,
    fontWeight: 700,
    color: "var(--accent)",
    textTransform: "uppercase" as const,
    letterSpacing: "0.06em",
    marginBottom: 4,
  } as React.CSSProperties,
  noteText: {
    fontSize: 14,
    color: "var(--text-secondary)",
    lineHeight: "1.6",
  } as React.CSSProperties,
  td: {
    padding: "12px 16px",
    borderBottom: "1px solid var(--bg-border)",
    fontSize: 14,
    color: "var(--text-secondary)",
    verticalAlign: "top" as const,
  } as React.CSSProperties,
  th: {
    textAlign: "left" as const,
    padding: "10px 16px",
    borderBottom: "2px solid var(--bg-border)",
    fontSize: 12,
    fontWeight: 600,
    color: "var(--text-tertiary)",
    textTransform: "uppercase" as const,
    letterSpacing: "0.06em",
  } as React.CSSProperties,
};

export default function IntegrationsPage() {
  return (
    <>
      <div style={{ marginBottom: 6 }}>
        <span style={{ fontSize: 12, color: "var(--text-tertiary)" }}>
          Last updated May 11, 2026
        </span>
      </div>
      <h1 style={S.h1}>Integrations</h1>
      <p style={{ ...S.p, fontSize: 16, marginBottom: 40 }}>
        PhishSlayer connects to your existing security stack to pull telemetry,
        send notifications, and execute response actions. Integrations are
        configured in{" "}
        <strong style={{ color: "var(--text-primary)" }}>
          Settings → Integrations
        </strong>
        .
      </p>

      <h2 id="available" style={S.h2}>
        Available Integrations
      </h2>
      <div style={{ overflowX: "auto", marginBottom: 24 }}>
        <table style={{ width: "100%", borderCollapse: "collapse" }}>
          <thead>
            <tr style={{ background: "var(--bg-surface)" }}>
              <th style={S.th}>Integration</th>
              <th style={S.th}>Category</th>
              <th style={S.th}>Plan</th>
            </tr>
          </thead>
          <tbody>
            <tr>
              <td style={S.td}>Wazuh EDR</td>
              <td style={S.td}>Endpoint Telemetry</td>
              <td style={S.td}>All</td>
            </tr>
            <tr>
              <td style={S.td}>Microsoft 365 / Entra ID</td>
              <td style={S.td}>Email + Identity</td>
              <td style={S.td}>SOC Pro+</td>
            </tr>
            <tr>
              <td style={S.td}>Slack</td>
              <td style={S.td}>Notifications</td>
              <td style={S.td}>All</td>
            </tr>
            <tr>
              <td style={S.td}>PagerDuty</td>
              <td style={S.td}>Incident Escalation</td>
              <td style={S.td}>SOC Pro+</td>
            </tr>
            <tr>
              <td style={S.td}>Generic Syslog (UDP/TCP)</td>
              <td style={S.td}>Log Ingestion</td>
              <td style={S.td}>All</td>
            </tr>
            <tr>
              <td style={S.td}>SIEM Connectors (Splunk, QRadar)</td>
              <td style={S.td}>Log Ingestion</td>
              <td style={S.td}>Command Center+</td>
            </tr>
            <tr>
              <td style={S.td}>TAXII 2.1 / STIX Feeds</td>
              <td style={S.td}>Threat Intelligence</td>
              <td style={S.td}>Command Center+</td>
            </tr>
            <tr>
              <td style={S.td}>Custom Webhook (inbound)</td>
              <td style={S.td}>Alert Ingestion</td>
              <td style={S.td}>All</td>
            </tr>
            <tr>
              <td style={S.td}>Outbound Webhooks</td>
              <td style={S.td}>Notifications / SOAR</td>
              <td style={S.td}>SOC Pro+</td>
            </tr>
          </tbody>
        </table>
      </div>

      <h2 id="microsoft-365" style={S.h2}>
        Microsoft 365 / Entra ID
      </h2>
      <p style={S.p}>
        The M365 integration gives PhishSlayer visibility into email security
        events, user behavior, and identity actions. It uses the Microsoft Graph
        API and requires an Azure app registration.
      </p>

      <h3 id="m365-setup" style={S.h3}>
        Setup
      </h3>
      <ol style={{ paddingLeft: 22, marginBottom: 16 }}>
        <li style={{ ...S.li, marginBottom: 10 }}>
          Go to{" "}
          <strong style={{ color: "var(--text-primary)" }}>
            Settings → Integrations → Microsoft 365
          </strong>
        </li>
        <li style={{ ...S.li, marginBottom: 10 }}>
          Click{" "}
          <strong style={{ color: "var(--text-primary)" }}>Connect</strong> —
          you will be redirected to Microsoft to authorize the app
        </li>
        <li style={{ ...S.li, marginBottom: 10 }}>
          Sign in as a Global Administrator and grant the requested permissions
        </li>
        <li style={{ ...S.li, marginBottom: 10 }}>
          The connector will sync the last 7 days of audit logs on first run
        </li>
      </ol>

      <h3 id="m365-perms" style={S.h3}>
        Required Permissions
      </h3>
      <CodeBlock
        lang="json"
        code={`{
  "roles": [
    "AuditLog.Read.All",
    "Mail.Read",
    "MailboxSettings.Read",
    "SecurityEvents.Read.All",
    "User.Read.All",
    "Directory.Read.All",
    "IdentityRiskyUser.Read.All"
  ]
}`}
      />

      <h3 id="m365-capabilities" style={S.h3}>
        Capabilities
      </h3>
      <ul style={S.ul}>
        <li style={S.li}>
          Email header analysis for phishing detection (SPF, DKIM, DMARC
          validation)
        </li>
        <li style={S.li}>
          Impossible travel and risky sign-in detection from Entra ID Identity
          Protection
        </li>
        <li style={S.li}>OAuth app consent grant monitoring</li>
        <li style={S.li}>Mailbox forwarding rule changes</li>
        <li style={S.li}>
          <strong style={{ color: "var(--text-primary)" }}>
            Response actions
          </strong>
          : disable accounts, revoke sessions, block senders, remove malicious
          emails from mailboxes
        </li>
      </ul>

      <h2 id="slack" style={S.h2}>
        Slack
      </h2>
      <p style={S.p}>
        Send real-time alert notifications to Slack channels. Configure routing
        rules so Critical alerts go to{" "}
        <code
          style={{
            fontFamily: "var(--font-mono)",
            fontSize: 12,
            background: "var(--bg-elevated)",
            padding: "1px 5px",
            borderRadius: 3,
            color: "#9175FF",
          }}
        >
          #soc-critical
        </code>{" "}
        and lower severity alerts go to{" "}
        <code
          style={{
            fontFamily: "var(--font-mono)",
            fontSize: 12,
            background: "var(--bg-elevated)",
            padding: "1px 5px",
            borderRadius: 3,
            color: "#9175FF",
          }}
        >
          #soc-alerts
        </code>
        .
      </p>
      <ol style={{ paddingLeft: 22, marginBottom: 16 }}>
        <li style={{ ...S.li, marginBottom: 10 }}>
          Go to{" "}
          <strong style={{ color: "var(--text-primary)" }}>
            Settings → Integrations → Slack
          </strong>
        </li>
        <li style={{ ...S.li, marginBottom: 10 }}>
          Click{" "}
          <strong style={{ color: "var(--text-primary)" }}>Add to Slack</strong>{" "}
          and authorize the PhishSlayer app in your workspace
        </li>
        <li style={{ ...S.li, marginBottom: 10 }}>
          Map severity levels to channels in the routing table
        </li>
        <li style={{ ...S.li, marginBottom: 10 }}>
          Optionally enable{" "}
          <strong style={{ color: "var(--text-primary)" }}>
            Analyst Actions
          </strong>{" "}
          — analysts can acknowledge or escalate alerts directly from the Slack
          message
        </li>
      </ol>

      <h2 id="pagerduty" style={S.h2}>
        PagerDuty
      </h2>
      <p style={S.p}>
        Route Critical and High alerts to PagerDuty for on-call paging.
        PhishSlayer creates PagerDuty incidents with full alert context and
        resolves them automatically when the PhishSlayer alert is closed.
      </p>
      <CodeBlock
        lang="json"
        filename="pagerduty-config.json"
        code={`{
  "integration_key": "YOUR_PAGERDUTY_EVENTS_API_KEY",
  "routing_rules": [
    { "severity": "critical", "service_id": "PSVC001", "urgency": "high" },
    { "severity": "high", "service_id": "PSVC001", "urgency": "low" }
  ],
  "auto_resolve": true,
  "include_ai_summary": true
}`}
      />

      <h2 id="webhooks" style={S.h2}>
        Webhooks
      </h2>

      <h3 id="inbound-webhooks" style={S.h3}>
        Inbound Webhooks
      </h3>
      <p style={S.p}>
        Send events from any system to PhishSlayer using the generic ingest
        webhook. Events are normalized and scored by the alert engine.
      </p>
      <CodeBlock
        lang="bash"
        code={`# Your inbound webhook URL (unique per organization)
POST https://phishslayer.tech/api/ingest
Authorization: Bearer YOUR_ORG_API_KEY
Content-Type: application/json

{
  "source": "custom-firewall",
  "timestamp": "2026-05-11T14:30:00Z",
  "severity": "high",
  "title": "Outbound connection to known C2 IP",
  "raw": { "src_ip": "10.0.1.42", "dst_ip": "45.33.32.156", "port": 443 }
}`}
      />

      <h3 id="outbound-webhooks" style={S.h3}>
        Outbound Webhooks
      </h3>
      <p style={S.p}>
        Configure outbound webhooks to push alert events to any SOAR platform,
        SIEM, or custom endpoint. Go to{" "}
        <strong style={{ color: "var(--text-primary)" }}>
          Settings → Integrations → Outbound Webhooks → Add
        </strong>{" "}
        and specify:
      </p>
      <ul style={S.ul}>
        <li style={S.li}>
          <strong style={{ color: "var(--text-primary)" }}>URL</strong> — Target
          HTTPS endpoint
        </li>
        <li style={S.li}>
          <strong style={{ color: "var(--text-primary)" }}>Secret</strong> —
          HMAC-SHA256 signing key for payload verification
        </li>
        <li style={S.li}>
          <strong style={{ color: "var(--text-primary)" }}>Events</strong> —
          Which events trigger delivery (alert.created, alert.escalated,
          alert.closed, ioc.matched)
        </li>
        <li style={S.li}>
          <strong style={{ color: "var(--text-primary)" }}>Filter</strong> —
          Optional severity or tag filter
        </li>
      </ul>

      <h2 id="mcp-tools" style={S.h2}>
        MCP Tool Integrations
      </h2>
      <p style={S.p}>
        PhishSlayer&apos;s AI agents use the Model Context Protocol (MCP) to
        call external tools during investigation and response. MCP tools extend
        agent capabilities without requiring custom code.
      </p>

      <h3 id="available-tools" style={S.h3}>
        Available MCP Tools
      </h3>
      <ul style={S.ul}>
        <li style={S.li}>
          <strong style={{ color: "var(--text-primary)" }}>
            Wazuh Active Response
          </strong>{" "}
          — Block IPs, isolate endpoints, run scripts remotely
        </li>
        <li style={S.li}>
          <strong style={{ color: "var(--text-primary)" }}>
            Microsoft Graph
          </strong>{" "}
          — Disable accounts, revoke tokens, remove email
        </li>
        <li style={S.li}>
          <strong style={{ color: "var(--text-primary)" }}>VirusTotal</strong> —
          Enrich IOCs with VT intelligence
        </li>
        <li style={S.li}>
          <strong style={{ color: "var(--text-primary)" }}>Shodan</strong> —
          Query host intelligence for IP addresses
        </li>
        <li style={S.li}>
          <strong style={{ color: "var(--text-primary)" }}>Supabase</strong> —
          Query and update case records directly
        </li>
      </ul>

      <h3 id="api-keys" style={S.h3}>
        API Key Configuration
      </h3>
      <p style={S.p}>
        Add API keys for external services in{" "}
        <strong style={{ color: "var(--text-primary)" }}>
          Settings → Integrations → API Keys
        </strong>
        . Keys are stored encrypted at rest using AES-256 and are never exposed
        in API responses or logs.
      </p>
      <CodeBlock
        lang="bash"
        code={`# Required API keys for full MCP tool coverage:
VIRUSTOTAL_API_KEY=...        # Free tier: 4 lookups/min
SHODAN_API_KEY=...            # Membership: required for full data
ANTHROPIC_API_KEY=...         # Required: L1/L2/L3 agents
RESEND_API_KEY=...            # Optional: email report delivery`}
      />

      <div style={S.note}>
        <div style={S.noteLabel}>Note</div>
        <div style={S.noteText}>
          API keys for MCP tools can also be set as environment variables in
          your deployment. Environment variables take precedence over keys
          configured in the Settings UI.
        </div>
      </div>

      <footer
        style={{
          marginTop: 64,
          paddingTop: 20,
          borderTop: "1px solid var(--bg-border)",
        }}
      >
        <p style={{ fontSize: 13, color: "var(--text-tertiary)", margin: 0 }}>
          Need a custom connector? Email{" "}
          <a
            href={`mailto:${SUPPORT_EMAIL}`}
            style={{ color: "var(--accent)", textDecoration: "none" }}
          >
            {SUPPORT_EMAIL}
          </a>
        </p>
      </footer>
    </>
  );
}
