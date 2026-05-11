import type { Metadata } from "next";
import Link from "next/link";
import { CONTACT_EMAIL, SUPPORT_EMAIL } from "@/lib/email";

export const metadata: Metadata = {
  title: "Billing & Pricing — PhishSlayer Docs",
  description:
    "Compare PhishSlayer plans, understand limits, and manage upgrades, downgrades, and cancellations.",
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
    fontSize: 13,
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

const CHECK = () => (
  <span style={{ color: "#10B981", fontWeight: 700 }}>✓</span>
);
const DASH = () => <span style={{ color: "var(--text-tertiary)" }}>—</span>;

export default function BillingPage() {
  return (
    <>
      <div style={{ marginBottom: 6 }}>
        <span style={{ fontSize: 12, color: "var(--text-tertiary)" }}>
          Last updated May 11, 2026
        </span>
      </div>
      <h1 style={S.h1}>Billing & Pricing</h1>
      <p style={{ ...S.p, fontSize: 16, marginBottom: 40 }}>
        PhishSlayer is available in four tiers designed to scale from individual
        analysts to large MSSP operations managing hundreds of tenants.
      </p>

      <h2 id="plans" style={S.h2}>
        Pricing Plans
      </h2>
      <div
        style={{
          display: "grid",
          gridTemplateColumns: "repeat(auto-fill, minmax(220px, 1fr))",
          gap: 16,
          marginBottom: 40,
        }}
      >
        {[
          {
            name: "Free",
            price: "$0",
            period: "forever",
            color: "#6B7280",
            desc: "Try PhishSlayer with basic features. No credit card required.",
            highlights: [
              "50 alerts/day",
              "1 user seat",
              "30-day retention",
              "L1 agent only",
              "Community support",
            ],
          },
          {
            name: "SOC Pro",
            price: "$1,499",
            period: "/month",
            color: "#7C5CFF",
            desc: "For small SOC teams that need AI-assisted triage.",
            highlights: [
              "50 alerts/day",
              "5 user seats",
              "90-day retention",
              "L1 + L2 agents",
              "3 integrations",
              "Email support (48h)",
            ],
            annualPrice: "$17,988/yr",
          },
          {
            name: "Command Center",
            price: "$4,999",
            period: "/month",
            color: "#10B981",
            desc: "Full AI agent stack with unlimited integrations.",
            highlights: [
              "Unlimited alerts",
              "25 user seats",
              "1-year retention",
              "L1 + L2 + L3 agents",
              "Unlimited integrations",
              "Priority support (8h SLA)",
            ],
            featured: true,
            annualPrice: "$59,988/yr",
          },
          {
            name: "Enterprise",
            price: "Custom",
            period: "",
            color: "#F97316",
            desc: "Dedicated infrastructure for large MSSPs and enterprises.",
            highlights: [
              "Custom pricing",
              "Unlimited users",
              "Custom retention",
              "Dedicated L3 sessions",
              "Custom SLA (down to 1h)",
              "Dedicated TAM",
            ],
          },
        ].map(({ name, price, period, color, desc, highlights, featured }) => (
          <div
            key={name}
            style={{
              background: featured
                ? "rgba(16,185,129,0.06)"
                : "var(--bg-surface)",
              border: `1px solid ${featured ? "rgba(16,185,129,0.4)" : "var(--bg-border)"}`,
              borderRadius: 10,
              padding: "20px",
              display: "flex",
              flexDirection: "column",
              gap: 12,
            }}
          >
            {featured && (
              <div
                style={{
                  fontSize: 10,
                  fontWeight: 700,
                  color: "#10B981",
                  textTransform: "uppercase",
                  letterSpacing: "0.08em",
                }}
              >
                Most Popular
              </div>
            )}
            <div>
              <div
                style={{
                  fontSize: 14,
                  fontWeight: 700,
                  color,
                  marginBottom: 4,
                }}
              >
                {name}
              </div>
              <div style={{ display: "flex", alignItems: "baseline", gap: 4 }}>
                <span
                  style={{
                    fontSize: 26,
                    fontWeight: 800,
                    color: "var(--text-primary)",
                  }}
                >
                  {price}
                </span>
                <span style={{ fontSize: 13, color: "var(--text-tertiary)" }}>
                  {period}
                </span>
              </div>
              {name === "SOC Pro" && (
                <div
                  style={{
                    fontSize: 13,
                    color: "var(--text-tertiary)",
                    marginTop: 4,
                  }}
                >
                  {"$1,499/mo billed annually"}
                </div>
              )}
              {name === "Command Center" && (
                <div
                  style={{
                    fontSize: 13,
                    color: "var(--text-tertiary)",
                    marginTop: 4,
                  }}
                >
                  {"$4,999/mo billed annually"}
                </div>
              )}
            </div>
            <p
              style={{
                fontSize: 13,
                color: "var(--text-secondary)",
                lineHeight: "1.5",
                margin: 0,
              }}
            >
              {desc}
            </p>
            <ul
              style={{
                listStyle: "none",
                padding: 0,
                margin: 0,
                display: "flex",
                flexDirection: "column",
                gap: 6,
              }}
            >
              {highlights.map((h) => (
                <li
                  key={h}
                  style={{
                    fontSize: 13,
                    color: "var(--text-secondary)",
                    display: "flex",
                    alignItems: "flex-start",
                    gap: 6,
                  }}
                >
                  <span
                    style={{ color: "#10B981", flexShrink: 0, marginTop: 1 }}
                  >
                    ✓
                  </span>
                  {h}
                </li>
              ))}
            </ul>
          </div>
        ))}
      </div>

      <h2 id="comparison" style={S.h2}>
        Feature Comparison
      </h2>
      <div style={{ overflowX: "auto", marginBottom: 32 }}>
        <table
          style={{ width: "100%", borderCollapse: "collapse", minWidth: 640 }}
        >
          <thead>
            <tr style={{ background: "var(--bg-surface)" }}>
              <th style={{ ...S.th, width: "35%" }}>Feature</th>
              <th style={{ ...S.th, textAlign: "center" as const }}>Free</th>
              <th style={{ ...S.th, textAlign: "center" as const }}>SOC Pro</th>
              <th style={{ ...S.th, textAlign: "center" as const }}>
                Command Center
              </th>
              <th style={{ ...S.th, textAlign: "center" as const }}>
                Enterprise
              </th>
            </tr>
          </thead>
          <tbody>
            {[
              ["Alerts / month", "500", "10,000", "100,000", "Unlimited"],
              ["User seats", "1", "5", "25", "Unlimited"],
              ["Data retention", "30 days", "90 days", "1 year", "Custom"],
              ["L1 Triage Agent", <CHECK />, <CHECK />, <CHECK />, <CHECK />],
              [
                "L2 Investigation Agent",
                <DASH />,
                <CHECK />,
                <CHECK />,
                <CHECK />,
              ],
              [
                "L3 Hunt & Response Agent",
                <DASH />,
                <DASH />,
                <CHECK />,
                <CHECK />,
              ],
              [
                "Wazuh EDR Integration",
                <CHECK />,
                <CHECK />,
                <CHECK />,
                <CHECK />,
              ],
              [
                "Microsoft 365 Integration",
                <DASH />,
                <CHECK />,
                <CHECK />,
                <CHECK />,
              ],
              ["MCP Tool Access", <DASH />, <DASH />, <CHECK />, <CHECK />],
              ["Custom Integrations", <DASH />, "3", "Unlimited", "Unlimited"],
              ["TAXII / STIX Feeds", <DASH />, <DASH />, <CHECK />, <CHECK />],
              [
                "MITRE ATT&CK Coverage Map",
                <DASH />,
                <CHECK />,
                <CHECK />,
                <CHECK />,
              ],
              [
                "PDF Report Generation",
                <DASH />,
                <CHECK />,
                <CHECK />,
                <CHECK />,
              ],
              ["Scheduled Reports", <DASH />, <DASH />, <CHECK />, <CHECK />],
              ["API Access", <DASH />, <CHECK />, <CHECK />, <CHECK />],
              ["SSO / SAML", <DASH />, <DASH />, <CHECK />, <CHECK />],
              ["Multi-tenant (MSSP)", <DASH />, <DASH />, <DASH />, <CHECK />],
              [
                "On-premise Deployment",
                <DASH />,
                <DASH />,
                <DASH />,
                <CHECK />,
              ],
              ["SLA", "None", "48h email", "8h priority", "Custom (≥1h)"],
              [
                "Support",
                "Community",
                "Email",
                "Priority email",
                "Dedicated TAM",
              ],
            ].map(([feature, free, pro, cc, ent], i) => (
              <tr
                key={i}
                style={{
                  background: i % 2 === 0 ? "var(--bg-surface)" : "transparent",
                }}
              >
                <td
                  style={{
                    ...S.td,
                    color: "var(--text-primary)",
                    fontWeight: 500,
                  }}
                >
                  {feature}
                </td>
                <td style={{ ...S.td, textAlign: "center" as const }}>
                  {free}
                </td>
                <td style={{ ...S.td, textAlign: "center" as const }}>{pro}</td>
                <td
                  style={{
                    ...S.td,
                    textAlign: "center" as const,
                    background: "rgba(16,185,129,0.04)",
                  }}
                >
                  {cc}
                </td>
                <td style={{ ...S.td, textAlign: "center" as const }}>{ent}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      <h2 id="upgrade" style={S.h2}>
        Upgrade & Downgrade
      </h2>
      <p style={S.p}>
        You can upgrade your plan at any time from{" "}
        <strong style={{ color: "var(--text-primary)" }}>
          Settings → Billing → Change Plan
        </strong>
        . Upgrades take effect immediately and you are charged a prorated amount
        for the remainder of the current billing period.
      </p>
      <p style={S.p}>
        Downgrades take effect at the end of your current billing period. If
        your usage exceeds the limits of the lower plan, you will be prompted to
        reduce usage before the downgrade completes. Data that exceeds the new
        retention window is not immediately deleted — it is queued for deletion
        30 days after the downgrade takes effect.
      </p>

      <div style={S.note}>
        <div style={S.noteLabel}>Note</div>
        <div style={S.noteText}>
          Changing from Command Center to SOC Pro will disable the L3 agent and
          any MCP tool integrations. Active hunts will be preserved in read-only
          mode for 30 days.
        </div>
      </div>

      <h2 id="overage" style={S.h2}>
        Overage Policy
      </h2>
      <p style={S.p}>
        If your organization exceeds the monthly alert limit, PhishSlayer will
        continue to ingest events but pause AI triage for new alerts until the
        next billing cycle. A banner will appear in the dashboard, and the
        primary billing contact will receive an email notification at 80% and
        100% of the limit.
      </p>
      <p style={S.p}>
        You can purchase additional alert capacity in blocks of 10,000 from{" "}
        <strong style={{ color: "var(--text-primary)" }}>
          Settings → Billing → Add Alert Capacity
        </strong>{" "}
        at any time during the billing period.
      </p>

      <h2 id="cancellation" style={S.h2}>
        Cancellation Policy
      </h2>
      <p style={S.p}>
        You may cancel your subscription at any time from{" "}
        <strong style={{ color: "var(--text-primary)" }}>
          Settings → Billing → Cancel Subscription
        </strong>
        . Cancellation takes effect at the end of the current billing period —
        you will retain full access to your plan until then.
      </p>
      <p style={S.p}>
        After cancellation, your account is downgraded to the Free tier. Your
        data (alerts, IOCs, cases, reports) is retained for 60 days after the
        cancellation date, after which it is permanently deleted. To request an
        earlier deletion or a data export, email{" "}
        <a
          href={`mailto:${SUPPORT_EMAIL}`}
          style={{ color: "var(--accent)", textDecoration: "none" }}
        >
          {SUPPORT_EMAIL}
        </a>
        .
      </p>

      <h2 id="refunds" style={S.h2}>
        Refunds
      </h2>
      <p style={S.p}>
        We offer a 14-day money-back guarantee on first-time paid subscriptions.
        If you are not satisfied within 14 days of your first payment, contact{" "}
        <a
          href={`mailto:${SUPPORT_EMAIL}`}
          style={{ color: "var(--accent)", textDecoration: "none" }}
        >
          {SUPPORT_EMAIL}
        </a>{" "}
        for a full refund — no questions asked.
      </p>
      <p style={S.p}>
        After the 14-day window, refunds are evaluated on a case-by-case basis
        for documented service outages exceeding our uptime SLA. Prorated
        refunds for mid-period downgrades are not issued.
      </p>

      <h2 id="enterprise-pricing" style={S.h2}>
        Enterprise Pricing
      </h2>
      <p style={S.p}>
        Enterprise pricing is tailored to your organization&apos;s size,
        telemetry volume, and support requirements. Typical enterprise
        agreements include:
      </p>
      <ul style={S.ul}>
        <li style={S.li}>
          Annual or multi-year contract with volume discounts
        </li>
        <li style={S.li}>Custom alert and retention limits</li>
        <li style={S.li}>On-premise or private cloud deployment option</li>
        <li style={S.li}>
          MSSP multi-tenant management with per-tenant billing
        </li>
        <li style={S.li}>Dedicated Technical Account Manager (TAM)</li>
        <li style={S.li}>Custom SLA with financial penalties for breach</li>
        <li style={S.li}>
          Annual penetration test report and shared security assessments
        </li>
      </ul>
      <p style={S.p}>
        Contact our sales team to discuss enterprise requirements:{" "}
        <a
          href={`mailto:${CONTACT_EMAIL}`}
          style={{ color: "var(--accent)", textDecoration: "none" }}
        >
          {CONTACT_EMAIL}
        </a>
      </p>

      <h2 id="payment" style={S.h2}>
        Payment Methods
      </h2>
      <p style={S.p}>
        All payments are processed securely via Polar.sh. We accept:
      </p>
      <ul style={S.ul}>
        <li style={S.li}>
          Visa, Mastercard, American Express, and Discover credit/debit cards
        </li>
        <li style={S.li}>
          ACH bank transfer (Enterprise plans, annual billing only)
        </li>
        <li style={S.li}>Invoice and PO for Enterprise customers</li>
      </ul>
      <p style={S.p}>
        Invoices are emailed to the billing contact address after each
        successful charge and are available for download in{" "}
        <strong style={{ color: "var(--text-primary)" }}>
          Settings → Billing → Invoice History
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
          Billing questions? Email{" "}
          <a
            href={`mailto:${SUPPORT_EMAIL}`}
            style={{ color: "var(--accent)", textDecoration: "none" }}
          >
            {SUPPORT_EMAIL}
          </a>{" "}
          — Enterprise sales:{" "}
          <a
            href={`mailto:${CONTACT_EMAIL}`}
            style={{ color: "var(--accent)", textDecoration: "none" }}
          >
            {CONTACT_EMAIL}
          </a>
        </p>
      </footer>
    </>
  );
}
