import type { Metadata } from "next";
import { SUPPORT_EMAIL } from "@/lib/email";
import CodeBlock from "@/components/docs/CodeBlock";

export const metadata: Metadata = {
  title: "IOC Management — PhishSlayer Docs",
  description:
    "Manage indicators of compromise: add, import, enrich, and act on IP addresses, domains, hashes, and more.",
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

export default function IOCsPage() {
  return (
    <>
      <div style={{ marginBottom: 6 }}>
        <span style={{ fontSize: 12, color: "var(--text-tertiary)" }}>
          Last updated May 11, 2026
        </span>
      </div>
      <h1 style={S.h1}>IOC Management</h1>
      <p style={{ ...S.p, fontSize: 16, marginBottom: 40 }}>
        Indicators of Compromise (IOCs) are the atomic pieces of threat
        intelligence that PhishSlayer matches against every inbound event. This
        guide covers adding, importing, enriching, and acting on IOCs across
        your environment.
      </p>

      <h2 id="ioc-types" style={S.h2}>
        IOC Types
      </h2>
      <p style={S.p}>
        PhishSlayer supports the following indicator types, all of which are
        automatically extracted from alert payloads and can be added manually:
      </p>
      <div style={{ overflowX: "auto", marginBottom: 24 }}>
        <table style={{ width: "100%", borderCollapse: "collapse" }}>
          <thead>
            <tr style={{ background: "var(--bg-surface)" }}>
              <th style={S.th}>Type</th>
              <th style={S.th}>Examples</th>
              <th style={S.th}>Matching</th>
            </tr>
          </thead>
          <tbody>
            <tr>
              <td style={S.td}>
                <code style={{ fontFamily: "var(--font-mono)", fontSize: 12 }}>
                  ip
                </code>
              </td>
              <td style={S.td}>192.168.1.1, 45.33.32.156</td>
              <td style={S.td}>Exact + CIDR range</td>
            </tr>
            <tr>
              <td style={S.td}>
                <code style={{ fontFamily: "var(--font-mono)", fontSize: 12 }}>
                  domain
                </code>
              </td>
              <td style={S.td}>evil.example.com</td>
              <td style={S.td}>Exact + subdomain wildcard</td>
            </tr>
            <tr>
              <td style={S.td}>
                <code style={{ fontFamily: "var(--font-mono)", fontSize: 12 }}>
                  url
                </code>
              </td>
              <td style={S.td}>https://evil.example.com/payload</td>
              <td style={S.td}>Exact + path prefix</td>
            </tr>
            <tr>
              <td style={S.td}>
                <code style={{ fontFamily: "var(--font-mono)", fontSize: 12 }}>
                  md5
                </code>
              </td>
              <td style={S.td}>d41d8cd98f00b204e9800998ecf8427e</td>
              <td style={S.td}>Exact</td>
            </tr>
            <tr>
              <td style={S.td}>
                <code style={{ fontFamily: "var(--font-mono)", fontSize: 12 }}>
                  sha1
                </code>
              </td>
              <td style={S.td}>da39a3ee5e6b4b0d3255bfef95601890afd80709</td>
              <td style={S.td}>Exact</td>
            </tr>
            <tr>
              <td style={S.td}>
                <code style={{ fontFamily: "var(--font-mono)", fontSize: 12 }}>
                  sha256
                </code>
              </td>
              <td style={S.td}>e3b0c44298fc1c149afbf4c8996fb924...</td>
              <td style={S.td}>Exact</td>
            </tr>
            <tr>
              <td style={S.td}>
                <code style={{ fontFamily: "var(--font-mono)", fontSize: 12 }}>
                  email
                </code>
              </td>
              <td style={S.td}>attacker@evil.com</td>
              <td style={S.td}>Exact + domain suffix</td>
            </tr>
            <tr>
              <td style={S.td}>
                <code style={{ fontFamily: "var(--font-mono)", fontSize: 12 }}>
                  asn
                </code>
              </td>
              <td style={S.td}>AS12345</td>
              <td style={S.td}>Exact</td>
            </tr>
          </tbody>
        </table>
      </div>

      <h2 id="adding-iocs" style={S.h2}>
        Adding IOCs Manually
      </h2>
      <p style={S.p}>
        Navigate to{" "}
        <strong style={{ color: "var(--text-primary)" }}>
          IOCs → Add Indicator
        </strong>{" "}
        and fill in the form:
      </p>
      <ul style={S.ul}>
        <li style={S.li}>
          <strong style={{ color: "var(--text-primary)" }}>Value</strong> — The
          indicator itself (IP, domain, hash, etc.)
        </li>
        <li style={S.li}>
          <strong style={{ color: "var(--text-primary)" }}>Type</strong> —
          Auto-detected or manually selected from the dropdown
        </li>
        <li style={S.li}>
          <strong style={{ color: "var(--text-primary)" }}>Confidence</strong> —
          Your confidence in the indicator (1–100). High confidence triggers
          immediate matching; low confidence requires corroboration.
        </li>
        <li style={S.li}>
          <strong style={{ color: "var(--text-primary)" }}>Threat Level</strong>{" "}
          — Critical / High / Medium / Low
        </li>
        <li style={S.li}>
          <strong style={{ color: "var(--text-primary)" }}>Tags</strong> —
          Free-form labels (e.g.,{" "}
          <code
            style={{
              fontFamily: "var(--font-mono)",
              fontSize: 12,
              background: "var(--bg-elevated)",
              padding: "1px 5px",
              borderRadius: 3,
            }}
          >
            ransomware
          </code>
          ,{" "}
          <code
            style={{
              fontFamily: "var(--font-mono)",
              fontSize: 12,
              background: "var(--bg-elevated)",
              padding: "1px 5px",
              borderRadius: 3,
            }}
          >
            apt-group-lazarus
          </code>
          )
        </li>
        <li style={S.li}>
          <strong style={{ color: "var(--text-primary)" }}>Expiry</strong> —
          Optional TTL. IOCs are automatically deactivated after this date.
        </li>
        <li style={S.li}>
          <strong style={{ color: "var(--text-primary)" }}>Source</strong> —
          Attribution (e.g., internal investigation, CISA KEV, vendor report)
        </li>
      </ul>

      <h2 id="bulk-import" style={S.h2}>
        Bulk CSV Import
      </h2>
      <p style={S.p}>
        For large batches, use the CSV importer at{" "}
        <strong style={{ color: "var(--text-primary)" }}>IOCs → Import</strong>.
        The CSV format is:
      </p>
      <CodeBlock
        lang="bash"
        filename="iocs-import.csv"
        code={`value,type,confidence,threat_level,tags,source,expiry
45.33.32.156,ip,90,high,"scanning,recon",Shodan,2026-12-31
evil-domain.ru,domain,75,critical,"c2,malware",ThreatFox,
d41d8cd98f00b204e9800998ecf8427e,md5,85,high,"ransomware",internal,2026-06-30`}
      />

      <div style={S.note}>
        <div style={{ ...S.noteLabel, color: "var(--accent)" }}>Note</div>
        <div style={S.noteText}>
          The{" "}
          <code style={{ fontFamily: "var(--font-mono)", fontSize: 12 }}>
            type
          </code>{" "}
          field is optional — PhishSlayer will auto-detect the type based on the
          value format. Expiry dates use ISO 8601 format (YYYY-MM-DD). Leave
          blank for no expiry.
        </div>
      </div>

      <p style={S.p}>
        The importer validates each row, reports any errors with line numbers,
        and processes up to 50,000 IOCs per import. Large imports are processed
        asynchronously — you will receive an email notification when complete.
      </p>

      <h2 id="enrichment" style={S.h2}>
        Automated Enrichment
      </h2>
      <p style={S.p}>
        When an IOC is added (manually or via import), PhishSlayer automatically
        queries external intelligence sources to enrich it with context:
      </p>
      <ul style={S.ul}>
        <li style={S.li}>
          <strong style={{ color: "var(--text-primary)" }}>VirusTotal</strong> —
          Detection ratio, file metadata, WHOIS, passive DNS
        </li>
        <li style={S.li}>
          <strong style={{ color: "var(--text-primary)" }}>
            AlienVault OTX
          </strong>{" "}
          — Pulse memberships, threat actor attribution
        </li>
        <li style={S.li}>
          <strong style={{ color: "var(--text-primary)" }}>Shodan</strong> —
          Open ports, services, geolocation for IP addresses
        </li>
        <li style={S.li}>
          <strong style={{ color: "var(--text-primary)" }}>WHOIS</strong> —
          Domain registration data and age
        </li>
        <li style={S.li}>
          <strong style={{ color: "var(--text-primary)" }}>GeoIP</strong> —
          Country, ASN, and hosting provider
        </li>
        <li style={S.li}>
          <strong style={{ color: "var(--text-primary)" }}>CISA KEV</strong> —
          Whether the indicator is associated with a known exploited
          vulnerability
        </li>
      </ul>
      <p style={S.p}>
        Enrichment runs asynchronously and typically completes within 30
        seconds. You can configure which sources are queried in{" "}
        <strong style={{ color: "var(--text-primary)" }}>
          Settings → Integrations → Threat Intelligence
        </strong>
        .
      </p>

      <h2 id="threat-feeds" style={S.h2}>
        Threat Feeds
      </h2>
      <p style={S.p}>
        Subscribe to community and commercial threat feeds that automatically
        sync IOCs into your database on a schedule:
      </p>
      <div style={{ overflowX: "auto", marginBottom: 24 }}>
        <table style={{ width: "100%", borderCollapse: "collapse" }}>
          <thead>
            <tr style={{ background: "var(--bg-surface)" }}>
              <th style={S.th}>Feed</th>
              <th style={S.th}>Type</th>
              <th style={S.th}>Sync</th>
              <th style={S.th}>Plan</th>
            </tr>
          </thead>
          <tbody>
            <tr>
              <td style={S.td}>CISA Known Exploited Vulnerabilities</td>
              <td style={S.td}>CVE / IOC</td>
              <td style={S.td}>Daily</td>
              <td style={S.td}>All</td>
            </tr>
            <tr>
              <td style={S.td}>abuse.ch URLhaus</td>
              <td style={S.td}>URL / Domain</td>
              <td style={S.td}>Hourly</td>
              <td style={S.td}>All</td>
            </tr>
            <tr>
              <td style={S.td}>Feodo Tracker (Botnet C2)</td>
              <td style={S.td}>IP</td>
              <td style={S.td}>Hourly</td>
              <td style={S.td}>All</td>
            </tr>
            <tr>
              <td style={S.td}>MalwareBazaar</td>
              <td style={S.td}>Hash</td>
              <td style={S.td}>Daily</td>
              <td style={S.td}>SOC Pro+</td>
            </tr>
            <tr>
              <td style={S.td}>MISP Community Feeds</td>
              <td style={S.td}>Mixed</td>
              <td style={S.td}>Daily</td>
              <td style={S.td}>Command Center+</td>
            </tr>
            <tr>
              <td style={S.td}>Custom TAXII 2.1 Feed</td>
              <td style={S.td}>STIX 2.1</td>
              <td style={S.td}>Configurable</td>
              <td style={S.td}>Command Center+</td>
            </tr>
          </tbody>
        </table>
      </div>
      <p style={S.p}>
        Enable feeds in{" "}
        <strong style={{ color: "var(--text-primary)" }}>
          Settings → Integrations → Threat Feeds
        </strong>
        . Each feed has configurable confidence and threat level defaults that
        are applied to all IOCs imported from that source.
      </p>

      <h2 id="response-actions" style={S.h2}>
        Response Actions
      </h2>
      <p style={S.p}>
        When an IOC is flagged as high-confidence and critical, you can trigger
        automated response actions:
      </p>
      <ul style={S.ul}>
        <li style={S.li}>
          <strong style={{ color: "var(--text-primary)" }}>
            Block on Wazuh Active Response
          </strong>{" "}
          — Adds the IP or domain to the deny list on all Wazuh-managed
          endpoints via the Active Response engine.
        </li>
        <li style={S.li}>
          <strong style={{ color: "var(--text-primary)" }}>DNS Sinkhole</strong>{" "}
          — Redirects domain resolution to a sinkhole IP, preventing beaconing
          from all endpoints using your internal DNS resolver.
        </li>
        <li style={S.li}>
          <strong style={{ color: "var(--text-primary)" }}>
            Firewall Block (via API)
          </strong>{" "}
          — Sends a block rule to integrated next-generation firewalls using the
          connectors API.
        </li>
        <li style={S.li}>
          <strong style={{ color: "var(--text-primary)" }}>
            Email Header Block
          </strong>{" "}
          — Adds the sender domain or IP to your Microsoft 365 tenant&apos;s
          block list via the Graph API.
        </li>
      </ul>

      <div style={S.warn}>
        <div style={{ ...S.noteLabel, color: "#EAB308" }}>Warning</div>
        <div style={S.noteText}>
          Response actions with a confidence score below 80 require manual
          approval by default. Automating low-confidence blocks can cause
          unintended disruption. Adjust thresholds in{" "}
          <strong>Settings → IOC Response Policy</strong>.
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
          Need help with threat feed configuration? Email{" "}
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
