import type { Metadata } from "next";
import CodeBlock from "@/components/docs/CodeBlock";
import { SUPPORT_EMAIL } from "@/lib/email";

export const metadata: Metadata = {
  title: "API Reference — PhishSlayer Docs",
  description:
    "PhishSlayer REST API: authentication, rate limits, endpoints, and examples.",
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
  method: (m: string) =>
    ({
      display: "inline-block",
      padding: "2px 7px",
      borderRadius: 4,
      fontSize: 11,
      fontWeight: 700,
      fontFamily: "var(--font-mono)",
      letterSpacing: "0.04em",
      marginRight: 8,
      background:
        m === "GET"
          ? "rgba(16,185,129,0.15)"
          : m === "POST"
            ? "rgba(124,92,255,0.15)"
            : m === "DELETE"
              ? "rgba(239,68,68,0.15)"
              : "rgba(234,179,8,0.15)",
      color:
        m === "GET"
          ? "#10B981"
          : m === "POST"
            ? "#9175FF"
            : m === "DELETE"
              ? "#EF4444"
              : "#EAB308",
    }) as React.CSSProperties,
  endpoint: {
    fontFamily: "var(--font-mono)",
    fontSize: 13,
    color: "var(--text-primary)",
  } as React.CSSProperties,
  row: {
    display: "flex",
    alignItems: "baseline",
    gap: 8,
    padding: "10px 0",
    borderBottom: "1px solid var(--bg-border)",
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

export default function APIPage() {
  return (
    <>
      <div style={{ marginBottom: 6 }}>
        <span style={{ fontSize: 12, color: "var(--text-tertiary)" }}>
          Last updated May 11, 2026
        </span>
      </div>
      <h1 style={S.h1}>API Reference</h1>
      <p style={{ ...S.p, fontSize: 16, marginBottom: 40 }}>
        The PhishSlayer REST API lets you integrate alert data, IOC management,
        hunting, and reporting into your own tools and workflows. All endpoints
        require authentication and return JSON.
      </p>

      <h2 id="base-url" style={S.h2}>
        Base URL
      </h2>
      <CodeBlock lang="bash" code={`https://phishslayer.tech/api`} />
      <p style={S.p}>
        All endpoints are relative to this base URL. The API does not currently
        support versioning — breaking changes are announced via email to API
        users with a 60-day migration window.
      </p>

      <h2 id="authentication" style={S.h2}>
        Authentication
      </h2>
      <p style={S.p}>
        The API uses Bearer token authentication. Generate an API key from{" "}
        <strong style={{ color: "var(--text-primary)" }}>
          Settings → API Keys → Create Key
        </strong>
        . Include it in every request:
      </p>
      <CodeBlock
        lang="bash"
        code={`curl -sSf https://phishslayer.tech/api/alerts \
  -H "Authorization: Bearer YOUR_API_KEY"`}
      />
      <p style={S.p}>
        API keys are organization-scoped. A key grants access to all resources
        within your organization. Keys do not expire but can be rotated or
        revoked from the Settings page at any time.
      </p>

      <div style={S.note}>
        <div style={S.noteLabel}>Security</div>
        <div style={S.noteText}>
          Never expose your API key in client-side code. Store it in environment
          variables or a secrets manager. If a key is compromised, revoke it
          immediately from <strong>Settings → API Keys</strong> and issue a new
          one.
        </div>
      </div>

      <h2 id="rate-limits" style={S.h2}>
        Rate Limits
      </h2>
      <p style={S.p}>
        All plans share the same rate limit of{" "}
        <strong style={{ color: "var(--text-primary)" }}>
          100 requests per minute
        </strong>{" "}
        per API key, applied via a sliding window. The following headers are
        returned on every response:
      </p>
      <CodeBlock
        lang="bash"
        code={`X-RateLimit-Limit: 100
X-RateLimit-Remaining: 87
X-RateLimit-Reset: 1715441400`}
      />
      <p style={S.p}>
        When the limit is exceeded the API returns{" "}
        <code
          style={{
            fontFamily: "var(--font-mono)",
            fontSize: 13,
            background: "var(--bg-elevated)",
            padding: "2px 5px",
            borderRadius: 3,
            color: "#EF4444",
          }}
        >
          429 Too Many Requests
        </code>
        . Retry after the number of seconds specified in the{" "}
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
          Retry-After
        </code>{" "}
        header.
      </p>

      <h2 id="pagination" style={S.h2}>
        Pagination
      </h2>
      <p style={S.p}>
        List endpoints use cursor-based pagination. The response includes a{" "}
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
          next_cursor
        </code>{" "}
        field when more results are available:
      </p>
      <CodeBlock
        lang="bash"
        code={`# First page
curl "https://phishslayer.tech/api/alerts?limit=50" \
  -H "Authorization: Bearer YOUR_API_KEY"

# Next page (use cursor from previous response)
curl "https://phishslayer.tech/api/alerts?limit=50&cursor=eyJpZCI6IjEyMyJ9" \
  -H "Authorization: Bearer YOUR_API_KEY"`}
      />
      <CodeBlock
        lang="json"
        code={`{
  "data": [...],
  "total": 2341,
  "next_cursor": "eyJpZCI6IjE3MyJ9",
  "has_more": true
}`}
      />

      <h2 id="alerts-api" style={S.h2}>
        Alerts API
      </h2>

      <h3 id="list-alerts" style={S.h3}>
        List Alerts
      </h3>
      <div style={S.row}>
        <span style={S.method("GET")}>GET</span>
        <span style={S.endpoint}>/api/alerts</span>
      </div>
      <p style={{ ...S.p, marginTop: 12 }}>
        Returns a paginated list of alerts, newest first. Supports filtering by
        severity, status, and date range.
      </p>
      <CodeBlock
        lang="bash"
        code={`curl "https://phishslayer.tech/api/alerts?severity=critical&status=new&limit=20" \
  -H "Authorization: Bearer YOUR_API_KEY"`}
      />
      <CodeBlock
        lang="json"
        code={`{
  "data": [
    {
      "id": "alert_01HXZ8KQMD7WNPQV0C",
      "title": "Suspicious LSASS memory read on DESKTOP-42A",
      "severity": "critical",
      "status": "triaging",
      "score": 94,
      "source": "wazuh",
      "created_at": "2026-05-11T14:30:00Z",
      "mitre_techniques": ["T1003.001"],
      "ioc_matches": 2,
      "assigned_to": null
    }
  ],
  "total": 47,
  "next_cursor": "eyJpZCI6IjQwIn0"
}`}
      />

      <h3 id="get-alert" style={S.h3}>
        Get Alert
      </h3>
      <div style={S.row}>
        <span style={S.method("GET")}>GET</span>
        <span style={S.endpoint}>/api/alerts/:id</span>
      </div>
      <p style={{ ...S.p, marginTop: 12 }}>
        Returns full alert details including AI analysis, timeline, and
        evidence.
      </p>

      <h3 id="acknowledge-alert" style={S.h3}>
        Acknowledge Alert
      </h3>
      <div style={S.row}>
        <span style={S.method("POST")}>POST</span>
        <span style={S.endpoint}>/api/alerts/:id/acknowledge</span>
      </div>

      <h3 id="false-positive" style={S.h3}>
        Mark as False Positive
      </h3>
      <div style={S.row}>
        <span style={S.method("POST")}>POST</span>
        <span style={S.endpoint}>/api/alerts/:id/false-positive</span>
      </div>
      <CodeBlock
        lang="json"
        code={`{
  "reason": "Legitimate pentest activity by Red Team",
  "suppression_window_hours": 24
}`}
      />

      <h2 id="iocs-api" style={S.h2}>
        IOC API
      </h2>

      <h3 id="list-iocs" style={S.h3}>
        List IOCs
      </h3>
      <div style={S.row}>
        <span style={S.method("GET")}>GET</span>
        <span style={S.endpoint}>/api/iocs</span>
      </div>

      <h3 id="create-ioc" style={S.h3}>
        Create IOC
      </h3>
      <div style={S.row}>
        <span style={S.method("POST")}>POST</span>
        <span style={S.endpoint}>/api/iocs</span>
      </div>
      <CodeBlock
        lang="bash"
        code={`curl -X POST https://phishslayer.tech/api/iocs \
  -H "Authorization: Bearer YOUR_API_KEY" \
  -H "Content-Type: application/json" \
  -d '{
    "value": "45.33.32.156",
    "type": "ip",
    "confidence": 90,
    "threat_level": "high",
    "tags": ["scanning", "recon"],
    "source": "internal-investigation"
  }'`}
      />

      <h3 id="delete-ioc" style={S.h3}>
        Delete IOC
      </h3>
      <div style={S.row}>
        <span style={S.method("DELETE")}>DELETE</span>
        <span style={S.endpoint}>/api/iocs/:id</span>
      </div>

      <h2 id="hunting-api" style={S.h2}>
        Hunting API
      </h2>

      <h3 id="run-hunt" style={S.h3}>
        Run Hunt
      </h3>
      <div style={S.row}>
        <span style={S.method("POST")}>POST</span>
        <span style={S.endpoint}>/api/hunting/run</span>
      </div>
      <CodeBlock
        lang="json"
        code={`{
  "query": "Find all PowerShell commands with encoded payloads in the last 48 hours",
  "lookback_hours": 48,
  "data_sources": ["wazuh", "windows_events"],
  "hypothesis_id": "hyp_lolbas_01"
}`}
      />

      <h3 id="hunt-history" style={S.h3}>
        Hunt History
      </h3>
      <div style={S.row}>
        <span style={S.method("GET")}>GET</span>
        <span style={S.endpoint}>/api/hunting/history</span>
      </div>

      <h2 id="errors" style={S.h2}>
        Error Codes
      </h2>
      <div style={{ overflowX: "auto", marginBottom: 24 }}>
        <table style={{ width: "100%", borderCollapse: "collapse" }}>
          <thead>
            <tr style={{ background: "var(--bg-surface)" }}>
              <th style={S.th}>Code</th>
              <th style={S.th}>Meaning</th>
              <th style={S.th}>Resolution</th>
            </tr>
          </thead>
          <tbody>
            {[
              [
                "400",
                "Bad Request",
                "Check the request body — a required field may be missing or malformed.",
              ],
              [
                "401",
                "Unauthorized",
                "API key is missing, invalid, or revoked. Check Authorization header.",
              ],
              [
                "403",
                "Forbidden",
                "Your plan does not include access to this endpoint.",
              ],
              [
                "404",
                "Not Found",
                "The requested resource ID does not exist or belongs to a different org.",
              ],
              [
                "409",
                "Conflict",
                "Duplicate IOC — an indicator with the same value already exists.",
              ],
              [
                "422",
                "Unprocessable Entity",
                "Validation failed. Response body contains a list of field-level errors.",
              ],
              [
                "429",
                "Too Many Requests",
                "Rate limit exceeded. Retry after the Retry-After header value (seconds).",
              ],
              [
                "500",
                "Internal Server Error",
                `Unexpected error. Contact ${SUPPORT_EMAIL} with the x-request-id from the response.`,
              ],
            ].map(([code, meaning, res], i) => (
              <tr
                key={code}
                style={{
                  background: i % 2 === 0 ? "var(--bg-surface)" : "transparent",
                }}
              >
                <td
                  style={{
                    ...S.td,
                    fontFamily: "var(--font-mono)",
                    fontSize: 13,
                    color:
                      Number(code) >= 500
                        ? "#EF4444"
                        : Number(code) >= 400
                          ? "#F97316"
                          : "var(--text-secondary)",
                  }}
                >
                  {code}
                </td>
                <td
                  style={{
                    ...S.td,
                    fontWeight: 500,
                    color: "var(--text-primary)",
                    fontSize: 14,
                  }}
                >
                  {meaning}
                </td>
                <td style={{ ...S.td, fontSize: 13 }}>{res}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      <footer
        style={{
          marginTop: 64,
          paddingTop: 20,
          borderTop: "1px solid var(--bg-border)",
        }}
      >
        <p style={{ fontSize: 13, color: "var(--text-tertiary)", margin: 0 }}>
          API questions? Email{" "}
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
