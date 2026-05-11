import type { Metadata } from "next";
import { CONTACT_EMAIL, SUPPORT_EMAIL } from "@/lib/email";

export const metadata: Metadata = {
  title: "Security & Compliance — PhishSlayer Docs",
  description:
    "PhishSlayer data handling, encryption, compliance (SOC 2, GDPR), access control, and incident response.",
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
  warn: {
    background: "rgba(234,179,8,0.08)",
    border: "1px solid rgba(234,179,8,0.25)",
    borderRadius: 8,
    padding: "12px 16px",
    marginBottom: 20,
  } as React.CSSProperties,
  noteLabel: {
    fontSize: 11,
    fontWeight: 700,
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

export default function SecurityPage() {
  return (
    <>
      <div style={{ marginBottom: 6 }}>
        <span style={{ fontSize: 12, color: "var(--text-tertiary)" }}>
          Last updated May 11, 2026
        </span>
      </div>
      <h1 style={S.h1}>Security & Compliance</h1>
      <p style={{ ...S.p, fontSize: 16, marginBottom: 40 }}>
        PhishSlayer is purpose-built for security operations. This page
        describes how we protect your data, which compliance frameworks we
        support, and how to report a security concern.
      </p>

      <h2 id="data-handling" style={S.h2}>
        Data Handling
      </h2>

      <h3 id="what-we-collect" style={S.h3}>
        What Data We Process
      </h3>
      <p style={S.p}>
        PhishSlayer processes security telemetry that you explicitly send us. We
        do not perform passive data collection. The data categories we process
        include:
      </p>
      <ul style={S.ul}>
        <li style={S.li}>
          <strong style={{ color: "var(--text-primary)" }}>
            Security events
          </strong>{" "}
          — Log entries, endpoint telemetry, and network flows from your
          integrated sources
        </li>
        <li style={S.li}>
          <strong style={{ color: "var(--text-primary)" }}>
            IOCs and threat intelligence
          </strong>{" "}
          — Indicators you add and enrichment data from external sources
        </li>
        <li style={S.li}>
          <strong style={{ color: "var(--text-primary)" }}>
            Email metadata
          </strong>{" "}
          — Headers, sender/recipient, and subject lines (not email body by
          default)
        </li>
        <li style={S.li}>
          <strong style={{ color: "var(--text-primary)" }}>
            User identities
          </strong>{" "}
          — Usernames, device names, and organizational unit paths from your
          directory
        </li>
        <li style={S.li}>
          <strong style={{ color: "var(--text-primary)" }}>
            Authentication events
          </strong>{" "}
          — Sign-in logs, MFA events, and failed authentication attempts
        </li>
      </ul>
      <p style={S.p}>
        We do not collect: email body content, document content, chat messages,
        file contents (only file hashes and metadata), or any data not sent via
        your configured integrations.
      </p>

      <h3 id="retention" style={S.h3}>
        Data Retention
      </h3>
      <p style={S.p}>
        Security events and alerts are retained for the period specified by your
        plan (30 days on Free, 90 days on SOC Pro, 1 year on Command Center,
        configurable on Enterprise). After the retention period, data is
        permanently deleted from both primary storage and backups within 30
        days.
      </p>

      <div style={{ overflowX: "auto", marginBottom: 24 }}>
        <table style={{ width: "100%", borderCollapse: "collapse" }}>
          <thead>
            <tr style={{ background: "var(--bg-surface)" }}>
              <th style={S.th}>Data Category</th>
              <th style={S.th}>Retention</th>
              <th style={S.th}>Notes</th>
            </tr>
          </thead>
          <tbody>
            <tr>
              <td style={S.td}>Security events / alerts</td>
              <td style={S.td}>Per plan</td>
              <td style={S.td}>30 days to configurable</td>
            </tr>
            <tr>
              <td style={S.td}>IOC database</td>
              <td style={S.td}>Until deleted or expired</td>
              <td style={S.td}>Expiry TTL configurable per IOC</td>
            </tr>
            <tr>
              <td style={S.td}>Case records</td>
              <td style={S.td}>Until account closure + 60 days</td>
              <td style={S.td}>Legal hold supported</td>
            </tr>
            <tr>
              <td style={S.td}>PDF reports</td>
              <td style={S.td}>12 months</td>
              <td style={S.td}>Download links expire in 7 days</td>
            </tr>
            <tr>
              <td style={S.td}>Audit logs (platform access)</td>
              <td style={S.td}>2 years</td>
              <td style={S.td}>Cannot be deleted by users</td>
            </tr>
            <tr>
              <td style={S.td}>Authentication logs (Clerk)</td>
              <td style={S.td}>90 days</td>
              <td style={S.td}>Managed by Clerk</td>
            </tr>
          </tbody>
        </table>
      </div>

      <h2 id="encryption" style={S.h2}>
        Encryption
      </h2>

      <h3 id="at-rest" style={S.h3}>
        At Rest
      </h3>
      <ul style={S.ul}>
        <li style={S.li}>
          <strong style={{ color: "var(--text-primary)" }}>Database</strong> —
          All data in Supabase (PostgreSQL) is encrypted using AES-256 at the
          storage layer. Supabase uses AWS RDS with KMS-managed keys.
        </li>
        <li style={S.li}>
          <strong style={{ color: "var(--text-primary)" }}>
            API keys and secrets
          </strong>{" "}
          — Stored encrypted in the database. Keys are never stored in plaintext
          or logged.
        </li>
        <li style={S.li}>
          <strong style={{ color: "var(--text-primary)" }}>
            File attachments
          </strong>{" "}
          — Stored in Supabase Storage (backed by AWS S3) with server-side
          AES-256 encryption.
        </li>
        <li style={S.li}>
          <strong style={{ color: "var(--text-primary)" }}>
            Environment secrets
          </strong>{" "}
          — Managed via the hosting provider&apos;s secrets management (Vercel
          encrypted environment variables).
        </li>
      </ul>

      <h3 id="in-transit" style={S.h3}>
        In Transit
      </h3>
      <ul style={S.ul}>
        <li style={S.li}>
          <strong style={{ color: "var(--text-primary)" }}>
            HTTPS / TLS 1.3
          </strong>{" "}
          — All traffic between clients and the PhishSlayer platform is
          encrypted. TLS 1.0 and 1.1 are disabled. Perfect Forward Secrecy is
          enforced.
        </li>
        <li style={S.li}>
          <strong style={{ color: "var(--text-primary)" }}>HSTS</strong> — HTTP
          Strict Transport Security is enabled with a 1-year max-age and
          includeSubDomains, preloaded in major browsers.
        </li>
        <li style={S.li}>
          <strong style={{ color: "var(--text-primary)" }}>
            Agent telemetry
          </strong>{" "}
          — Data sent from Wazuh agents to the ingest API uses TLS 1.3 with
          certificate pinning.
        </li>
        <li style={S.li}>
          <strong style={{ color: "var(--text-primary)" }}>
            Supabase connections
          </strong>{" "}
          — Server-side Supabase connections use the service role key over
          encrypted channels. Row Level Security (RLS) policies enforce
          multi-tenant isolation.
        </li>
      </ul>

      <h2 id="access-control" style={S.h2}>
        Access Control
      </h2>

      <h3 id="rbac" style={S.h3}>
        Role-Based Access Control
      </h3>
      <p style={S.p}>
        PhishSlayer uses Clerk for authentication and implements RBAC at the
        application layer. Available roles:
      </p>
      <div style={{ overflowX: "auto", marginBottom: 24 }}>
        <table style={{ width: "100%", borderCollapse: "collapse" }}>
          <thead>
            <tr style={{ background: "var(--bg-surface)" }}>
              <th style={S.th}>Role</th>
              <th style={S.th}>Permissions</th>
            </tr>
          </thead>
          <tbody>
            <tr>
              <td
                style={{
                  ...S.td,
                  fontWeight: 500,
                  color: "var(--text-primary)",
                }}
              >
                Owner
              </td>
              <td style={S.td}>
                Full access. Manage billing, invite/remove members, delete
                organization, configure all settings.
              </td>
            </tr>
            <tr>
              <td
                style={{
                  ...S.td,
                  fontWeight: 500,
                  color: "var(--text-primary)",
                }}
              >
                Admin
              </td>
              <td style={S.td}>
                Full access except billing and organization deletion. Can manage
                integrations and user roles.
              </td>
            </tr>
            <tr>
              <td
                style={{
                  ...S.td,
                  fontWeight: 500,
                  color: "var(--text-primary)",
                }}
              >
                Analyst
              </td>
              <td style={S.td}>
                View, acknowledge, escalate, and close alerts. Run hunts. Create
                and update cases. Generate reports.
              </td>
            </tr>
            <tr>
              <td
                style={{
                  ...S.td,
                  fontWeight: 500,
                  color: "var(--text-primary)",
                }}
              >
                Read Only
              </td>
              <td style={S.td}>
                View alerts, IOCs, and reports. No write access. Suitable for
                auditors and stakeholders.
              </td>
            </tr>
            <tr>
              <td
                style={{
                  ...S.td,
                  fontWeight: 500,
                  color: "var(--text-primary)",
                }}
              >
                API Key
              </td>
              <td style={S.td}>
                Machine identity for API integrations. Inherits Analyst
                permissions by default; configurable.
              </td>
            </tr>
          </tbody>
        </table>
      </div>

      <h3 id="sso" style={S.h3}>
        Single Sign-On
      </h3>
      <p style={S.p}>
        SSO via SAML 2.0 is available on Command Center and Enterprise plans.
        Supported identity providers include Okta, Azure AD, Google Workspace,
        and any SAML 2.0-compliant IdP. Configure SSO in{" "}
        <strong style={{ color: "var(--text-primary)" }}>
          Settings → Security → Single Sign-On
        </strong>
        .
      </p>
      <p style={S.p}>
        When SSO is enabled, password login is automatically disabled for all
        members except the Owner account (as a break-glass option). MFA is
        enforced through your IdP.
      </p>

      <h2 id="compliance" style={S.h2}>
        Compliance
      </h2>

      <div
        style={{
          display: "grid",
          gridTemplateColumns: "repeat(auto-fill, minmax(200px, 1fr))",
          gap: 12,
          marginBottom: 24,
        }}
      >
        {[
          {
            name: "SOC 2 Type II",
            status: "In Progress",
            color: "#EAB308",
            desc: "Audit in progress. Expected completion Q4 2026. Report available to Enterprise customers under NDA.",
          },
          {
            name: "GDPR",
            status: "Ready",
            color: "#10B981",
            desc: "Data processing agreements (DPAs) available on request. EU data residency on Enterprise plans.",
          },
          {
            name: "ISO 27001",
            status: "Planned",
            color: "#6B7280",
            desc: "Planned for 2027 certification cycle.",
          },
          {
            name: "HIPAA",
            status: "Not Applicable",
            color: "#6B7280",
            desc: "PhishSlayer does not process PHI. BAA not required.",
          },
        ].map(({ name, status, color, desc }) => (
          <div
            key={name}
            style={{
              background: "var(--bg-surface)",
              border: "1px solid var(--bg-border)",
              borderRadius: 8,
              padding: "14px 16px",
            }}
          >
            <div
              style={{
                fontSize: 13,
                fontWeight: 600,
                color: "var(--text-primary)",
                marginBottom: 4,
              }}
            >
              {name}
            </div>
            <div
              style={{
                fontSize: 11,
                fontWeight: 700,
                color,
                background: `${color}18`,
                padding: "2px 6px",
                borderRadius: 4,
                display: "inline-block",
                marginBottom: 8,
              }}
            >
              {status}
            </div>
            <div
              style={{
                fontSize: 12,
                color: "var(--text-secondary)",
                lineHeight: "1.5",
              }}
            >
              {desc}
            </div>
          </div>
        ))}
      </div>

      <h2 id="data-residency" style={S.h2}>
        Data Residency
      </h2>
      <p style={S.p}>
        By default, all data is stored in{" "}
        <strong style={{ color: "var(--text-primary)" }}>
          US East (AWS us-east-1)
        </strong>{" "}
        via Supabase. EU data residency (
        <code
          style={{
            fontFamily: "var(--font-mono)",
            fontSize: 13,
            background: "var(--bg-elevated)",
            padding: "2px 5px",
            borderRadius: 3,
            color: "#9175FF",
          }}
        >
          eu-west-1
        </code>
        ) is available on Enterprise plans — contact{" "}
        <a
          href={`mailto:${CONTACT_EMAIL}`}
          style={{ color: "var(--accent)", textDecoration: "none" }}
        >
          {CONTACT_EMAIL}
        </a>{" "}
        to configure this before onboarding.
      </p>
      <p style={S.p}>
        Anthropic Claude API calls for L1/L2/L3 agent processing are made to
        Anthropic&apos;s API endpoints. Security event data included in prompts
        is subject to Anthropic&apos;s data usage policy. We recommend reviewing{" "}
        <a
          href="https://www.anthropic.com/privacy"
          style={{ color: "var(--accent)", textDecoration: "none" }}
          target="_blank"
          rel="noopener noreferrer"
        >
          Anthropic&apos;s privacy policy
        </a>
        . Enterprise customers can request an Anthropic Business Associate
        Agreement or opt for on-premise model deployment.
      </p>

      <h2 id="pen-testing" style={S.h2}>
        Penetration Testing
      </h2>
      <p style={S.p}>
        PhishSlayer conducts annual third-party penetration tests against the
        production environment. Summaries of findings and remediation status are
        available to Command Center and Enterprise customers upon request under
        a signed NDA.
      </p>
      <p style={S.p}>
        Customers wishing to conduct their own penetration tests against their
        PhishSlayer deployment must notify us in advance at{" "}
        <a
          href="mailto:security@phishslayer.tech"
          style={{ color: "var(--accent)", textDecoration: "none" }}
        >
          security@phishslayer.tech
        </a>
        . Tests must be limited to your own organization&apos;s data and must
        not target shared infrastructure.
      </p>

      <h2 id="vulnerability-disclosure" style={S.h2}>
        Vulnerability Disclosure
      </h2>
      <p style={S.p}>
        We operate a responsible disclosure program. If you discover a security
        vulnerability in PhishSlayer, please report it to:
      </p>
      <div style={S.note}>
        <div style={S.noteLabel}>Security Contact</div>
        <div style={S.noteText}>
          <strong>Email:</strong>{" "}
          <a
            href="mailto:security@phishslayer.tech"
            style={{ color: "var(--accent)", textDecoration: "none" }}
          >
            security@phishslayer.tech
          </a>
          <br />
          <strong>PGP Key:</strong> Available on request
          <br />
          <strong>Response SLA:</strong> We acknowledge all reports within 48
          hours and provide a severity assessment within 5 business days.
          <br />
          <strong>Scope:</strong> phishslayer.tech and all subdomains, the
          PhishSlayer sensor binary, and the REST API.
        </div>
      </div>
      <p style={S.p}>
        We do not offer a bug bounty program at this time, but we do acknowledge
        researchers in our release notes (with permission) and take all reports
        seriously.
      </p>

      <h2 id="incident-response" style={S.h2}>
        Incident Response
      </h2>
      <p style={S.p}>
        In the event of a data breach or security incident affecting customer
        data, PhishSlayer will:
      </p>
      <ul style={S.ul}>
        <li style={S.li}>
          Notify affected customers within{" "}
          <strong style={{ color: "var(--text-primary)" }}>72 hours</strong> of
          confirming the incident (GDPR-compliant)
        </li>
        <li style={S.li}>
          Provide a detailed post-incident report within 30 days
        </li>
        <li style={S.li}>
          Coordinate with customers on any required regulatory notifications
        </li>
        <li style={S.li}>
          Publish a public post-mortem for significant incidents (at our
          discretion)
        </li>
      </ul>
      <p style={S.p}>
        To report a suspected security incident on your own account, email{" "}
        <a
          href={`mailto:${SUPPORT_EMAIL}`}
          style={{ color: "var(--accent)", textDecoration: "none" }}
        >
          {SUPPORT_EMAIL}
        </a>{" "}
        and include &ldquo;SECURITY INCIDENT&rdquo; in the subject line for
        prioritized handling.
      </p>

      <footer
        style={{
          marginTop: 64,
          paddingTop: 20,
          borderTop: "1px solid var(--bg-border)",
        }}
      >
        <p style={{ fontSize: 13, color: "var(--text-tertiary)", margin: 0 }}>
          Security concerns:{" "}
          <a
            href="mailto:security@phishslayer.tech"
            style={{ color: "var(--accent)", textDecoration: "none" }}
          >
            security@phishslayer.tech
          </a>{" "}
          — General support:{" "}
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
