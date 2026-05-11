import type { Metadata } from "next";
import { SUPPORT_EMAIL } from "@/lib/email";
import CodeBlock from "@/components/docs/CodeBlock";

export const metadata: Metadata = {
  title: "Reports — PhishSlayer Docs",
  description:
    "Generate PDF reports, schedule automated delivery, and customize report templates in PhishSlayer.",
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

export default function ReportsPage() {
  return (
    <>
      <div style={{ marginBottom: 6 }}>
        <span style={{ fontSize: 12, color: "var(--text-tertiary)" }}>
          Last updated May 11, 2026
        </span>
      </div>
      <h1 style={S.h1}>Reports</h1>
      <p style={{ ...S.p, fontSize: 16, marginBottom: 40 }}>
        PhishSlayer generates professional PDF reports for executive briefings,
        incident documentation, threat intelligence summaries, and compliance
        evidence. Reports are available on SOC Pro and above plans.
      </p>

      <h2 id="report-types" style={S.h2}>
        Report Types
      </h2>
      <div
        style={{
          display: "grid",
          gridTemplateColumns: "repeat(auto-fill, minmax(240px, 1fr))",
          gap: 12,
          marginBottom: 32,
        }}
      >
        {[
          {
            name: "Executive Summary",
            icon: "📊",
            desc: "High-level security posture overview: alert volume, MTTR, top threats, trend charts. Designed for board and leadership audiences.",
            plan: "SOC Pro+",
          },
          {
            name: "Incident Report",
            icon: "🔍",
            desc: "Full incident documentation with timeline, attack chain, evidence, MITRE mapping, and recommended remediation. Suitable for legal and insurance.",
            plan: "SOC Pro+",
          },
          {
            name: "Threat Intelligence",
            icon: "🌐",
            desc: "IOC summary, threat feed coverage, top attack sources by geo and ASN, and MITRE ATT&CK coverage heatmap.",
            plan: "SOC Pro+",
          },
          {
            name: "IOC Export",
            icon: "📋",
            desc: "Machine-readable export of your IOC database in STIX 2.1 or CSV format for sharing with partners or SIEM systems.",
            plan: "All plans",
          },
          {
            name: "Hunt Report",
            icon: "🔎",
            desc: "Findings, confidence scores, and IOCs discovered during a specific threat hunt session. Includes L3 narrative.",
            plan: "Command Center+",
          },
          {
            name: "Compliance Evidence",
            icon: "✅",
            desc: "Evidence package for SOC 2 / ISO 27001 audits: alert response SLA compliance, access logs, data handling summary.",
            plan: "Command Center+",
          },
        ].map(({ name, icon, desc, plan }) => (
          <div
            key={name}
            style={{
              background: "var(--bg-surface)",
              border: "1px solid var(--bg-border)",
              borderRadius: 8,
              padding: "16px",
            }}
          >
            <div style={{ fontSize: 20, marginBottom: 8 }}>{icon}</div>
            <div
              style={{
                fontSize: 14,
                fontWeight: 600,
                color: "var(--text-primary)",
                marginBottom: 4,
              }}
            >
              {name}
            </div>
            <div
              style={{
                fontSize: 12,
                color: "var(--text-secondary)",
                lineHeight: "1.5",
                marginBottom: 8,
              }}
            >
              {desc}
            </div>
            <div
              style={{ fontSize: 11, color: "var(--accent)", fontWeight: 600 }}
            >
              {plan}
            </div>
          </div>
        ))}
      </div>

      <h2 id="generate" style={S.h2}>
        Generating a Report
      </h2>
      <p style={S.p}>
        Reports can be generated from the{" "}
        <strong style={{ color: "var(--text-primary)" }}>Reports</strong>{" "}
        section of the dashboard or via the API.
      </p>

      <h3 id="from-dashboard" style={S.h3}>
        From the Dashboard
      </h3>
      <ol style={{ paddingLeft: 22, marginBottom: 16 }}>
        <li style={{ ...S.li, marginBottom: 10 }}>
          Navigate to{" "}
          <strong style={{ color: "var(--text-primary)" }}>
            Reports → New Report
          </strong>
        </li>
        <li style={{ ...S.li, marginBottom: 10 }}>
          Select the report type from the list above
        </li>
        <li style={{ ...S.li, marginBottom: 10 }}>
          Set the date range (default: last 30 days)
        </li>
        <li style={{ ...S.li, marginBottom: 10 }}>
          Configure optional sections to include or exclude
        </li>
        <li style={{ ...S.li, marginBottom: 10 }}>
          Add your organization logo and branding (Command Center+)
        </li>
        <li style={{ ...S.li, marginBottom: 10 }}>
          Click{" "}
          <strong style={{ color: "var(--text-primary)" }}>Generate</strong> —
          the report compiles asynchronously in the background
        </li>
        <li style={{ ...S.li, marginBottom: 10 }}>
          Download the PDF when the status shows{" "}
          <strong style={{ color: "#10B981" }}>Ready</strong> (usually under 30
          seconds)
        </li>
      </ol>

      <h3 id="from-api" style={S.h3}>
        Via API
      </h3>
      <CodeBlock
        lang="bash"
        code={`# Generate a report via API
curl -X POST https://phishslayer.tech/api/reports \
  -H "Authorization: Bearer YOUR_API_KEY" \
  -H "Content-Type: application/json" \
  -d '{
    "type": "executive_summary",
    "from": "2026-04-01",
    "to": "2026-04-30",
    "include_sections": ["alert_volume", "mttr", "top_threats", "mitre_heatmap"]
  }'`}
      />
      <CodeBlock
        lang="json"
        code={`{
  "id": "rpt_01HYABCDEFGHJKLMNPQR",
  "status": "pending",
  "type": "executive_summary",
  "created_at": "2026-05-11T14:30:00Z",
  "download_url": null
}`}
      />
      <CodeBlock
        lang="bash"
        code={`# Poll for completion (or use webhook notification)
curl "https://phishslayer.tech/api/reports/rpt_01HYABCDEFGHJKLMNPQR" \
  -H "Authorization: Bearer YOUR_API_KEY"

# Response when ready:
# { "status": "ready", "download_url": "https://phishslayer.tech/api/reports/.../download" }`}
      />

      <h2 id="scheduling" style={S.h2}>
        Scheduling Reports
      </h2>
      <p style={S.p}>
        Automate recurring reports with scheduled delivery. Available on Command
        Center and Enterprise plans.
      </p>
      <ol style={{ paddingLeft: 22, marginBottom: 16 }}>
        <li style={{ ...S.li, marginBottom: 10 }}>
          Go to{" "}
          <strong style={{ color: "var(--text-primary)" }}>
            Reports → Scheduled Reports → New Schedule
          </strong>
        </li>
        <li style={{ ...S.li, marginBottom: 10 }}>
          Choose report type, date range (relative: &ldquo;last 7 days&rdquo;,
          &ldquo;last month&rdquo;, etc.), and sections
        </li>
        <li style={{ ...S.li, marginBottom: 10 }}>
          Set the schedule: daily, weekly (choose day), monthly (choose date),
          or custom cron expression
        </li>
        <li style={{ ...S.li, marginBottom: 10 }}>
          Configure email delivery recipients and subject line
        </li>
        <li style={{ ...S.li, marginBottom: 10 }}>
          Optionally configure a webhook to receive the download URL when the
          report is ready
        </li>
      </ol>

      <div style={S.note}>
        <div style={S.noteLabel}>Note</div>
        <div style={S.noteText}>
          Scheduled reports use the organization&apos;s time zone setting
          (configured in <strong>Settings → Organization → Time Zone</strong>).
          Daily reports run at 06:00 local time by default.
        </div>
      </div>

      <h2 id="pdf-export" style={S.h2}>
        PDF Customization
      </h2>
      <p style={S.p}>
        On Command Center and Enterprise plans you can customize the PDF output:
      </p>
      <ul style={S.ul}>
        <li style={S.li}>
          <strong style={{ color: "var(--text-primary)" }}>Logo</strong> —
          Upload your organization logo (PNG or SVG, square recommended).
          Appears in the PDF header and cover page.
        </li>
        <li style={S.li}>
          <strong style={{ color: "var(--text-primary)" }}>Cover page</strong> —
          Add a custom title, subtitle, and classification label (e.g.,
          TLP:AMBER, CONFIDENTIAL)
        </li>
        <li style={S.li}>
          <strong style={{ color: "var(--text-primary)" }}>Color theme</strong>{" "}
          — Choose primary accent color to match your brand
        </li>
        <li style={S.li}>
          <strong style={{ color: "var(--text-primary)" }}>Sections</strong> —
          Toggle individual sections on/off for each report type
        </li>
        <li style={S.li}>
          <strong style={{ color: "var(--text-primary)" }}>Footer text</strong>{" "}
          — Custom footer with your organization name and classification
        </li>
      </ul>
      <p style={S.p}>
        Customization settings are configured per report type at{" "}
        <strong style={{ color: "var(--text-primary)" }}>
          Reports → Templates
        </strong>
        .
      </p>

      <h2 id="email-delivery" style={S.h2}>
        Email Delivery
      </h2>
      <p style={S.p}>
        Reports can be delivered automatically to multiple email recipients. The
        email includes:
      </p>
      <ul style={S.ul}>
        <li style={S.li}>
          A brief summary of key metrics (total alerts, MTTR, top threat
          category)
        </li>
        <li style={S.li}>The full PDF report as an attachment</li>
        <li style={S.li}>A secure download link valid for 7 days</li>
      </ul>
      <p style={S.p}>
        Email delivery is powered by Resend and requires the{" "}
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
          RESEND_API_KEY
        </code>{" "}
        environment variable to be configured. If you are using PhishSlayer
        Cloud (phishslayer.tech), email delivery is pre-configured and does not
        require any setup.
      </p>

      <h2 id="incident-report" style={S.h2}>
        Incident Report Deep Dive
      </h2>
      <p style={S.p}>
        The Incident Report is the most detailed report type. It is generated
        from a specific{" "}
        <strong style={{ color: "var(--text-primary)" }}>Case</strong> and
        includes:
      </p>
      <ul style={S.ul}>
        <li style={S.li}>
          <strong style={{ color: "var(--text-primary)" }}>
            Executive summary
          </strong>{" "}
          — 2-paragraph plain-English narrative generated by the L3 agent
        </li>
        <li style={S.li}>
          <strong style={{ color: "var(--text-primary)" }}>
            Attack timeline
          </strong>{" "}
          — Chronological sequence of attacker actions with timestamps
        </li>
        <li style={S.li}>
          <strong style={{ color: "var(--text-primary)" }}>
            Attack chain diagram
          </strong>{" "}
          — Visual flow from initial access through impact
        </li>
        <li style={S.li}>
          <strong style={{ color: "var(--text-primary)" }}>
            MITRE ATT&CK mapping
          </strong>{" "}
          — Techniques and tactics observed, with references
        </li>
        <li style={S.li}>
          <strong style={{ color: "var(--text-primary)" }}>
            IOCs discovered
          </strong>{" "}
          — Full list of indicators with enrichment data
        </li>
        <li style={S.li}>
          <strong style={{ color: "var(--text-primary)" }}>
            Affected systems
          </strong>{" "}
          — Endpoints, accounts, and services impacted
        </li>
        <li style={S.li}>
          <strong style={{ color: "var(--text-primary)" }}>
            Actions taken
          </strong>{" "}
          — Containment steps executed by agents and analysts
        </li>
        <li style={S.li}>
          <strong style={{ color: "var(--text-primary)" }}>
            Remediation recommendations
          </strong>{" "}
          — Prioritized list with effort estimates
        </li>
        <li style={S.li}>
          <strong style={{ color: "var(--text-primary)" }}>Appendix</strong> —
          Raw log excerpts and evidence links with chain of custody hash
        </li>
      </ul>
      <p style={S.p}>
        Generate an Incident Report from any Case by navigating to the case
        detail page and clicking{" "}
        <strong style={{ color: "var(--text-primary)" }}>
          Generate Report
        </strong>
        .
      </p>

      <footer
        style={{
          marginTop: 64,
          paddingTop: 20,
          borderTop: "1px solid var(--bg-border)",
        }}
      >
        <p style={{ fontSize: 13, color: "var(--text-tertiary)", margin: 0 }}>
          Questions about reporting? Email{" "}
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
