"use client";

import { useEffect, useMemo, useState } from "react";
import type { IdentityChain } from "@/lib/microsoft/types";

type ChainSummary = {
  totalChains: number;
  highRisk: number;
  partialGraphs: number;
  avgConfidence: number;
};

type Anomaly = {
  type: string;
  severity: "low" | "medium" | "high" | "critical";
  description: string;
  affectedChainId?: string;
  timestamp: string;
};

type AnomalyCounts = {
  critical: number;
  high: number;
  medium: number;
  total: number;
};

export default function IdentityDashboardPage() {
  const [activeTab, setActiveTab] = useState<"chains" | "anomalies">("chains");
  const [chains, setChains] = useState<IdentityChain[]>([]);
  const [summary, setSummary] = useState<ChainSummary | null>(null);
  const [anomalies, setAnomalies] = useState<Anomaly[]>([]);
  const [anomalyCounts, setAnomalyCounts] = useState<AnomalyCounts>({
    critical: 0,
    high: 0,
    medium: 0,
    total: 0,
  });
  const [loading, setLoading] = useState(true);
  const [hours, setHours] = useState(24);
  const [downloading, setDownloading] = useState(false);

  useEffect(() => {
    if (activeTab === "chains") {
      void fetchChains();
      return;
    }
    void fetchAnomalies();
  }, [hours, activeTab]);

  async function fetchChains() {
    setLoading(true);
    try {
      const response = await fetch(`/api/v2/identity/chain?hours=${hours}`);
      const data = (await response.json()) as {
        chains?: IdentityChain[];
        summary?: ChainSummary;
      };

      setChains(data.chains || []);
      setSummary(data.summary || null);
    } catch (error) {
      console.error("Failed to fetch chains:", error);
    } finally {
      setLoading(false);
    }
  }

  async function fetchAnomalies() {
    setLoading(true);
    try {
      const response = await fetch(`/api/v2/identity/anomalies?hours=${hours}`);
      const data = (await response.json()) as {
        anomalies?: Anomaly[];
        counts?: AnomalyCounts;
      };

      setAnomalies(data.anomalies || []);
      setAnomalyCounts(
        data.counts || {
          critical: 0,
          high: 0,
          medium: 0,
          total: 0,
        },
      );
    } catch (error) {
      console.error("Failed to fetch anomalies:", error);
    } finally {
      setLoading(false);
    }
  }

  const sortedAnomalies = useMemo(() => {
    const order = { critical: 0, high: 1, medium: 2, low: 3 };
    return [...anomalies].sort((a, b) => order[a.severity] - order[b.severity]);
  }, [anomalies]);

  function getConfidenceColor(score: number): string {
    if (score >= 80) return "#3FB950";
    if (score >= 60) return "#E3B341";
    return "#F85149";
  }

  function getVerdictBg(verdict: string): string {
    if (verdict.startsWith("HIGH")) return "#F85149";
    if (verdict.startsWith("ELEVATED")) return "#E3B341";
    if (verdict.startsWith("PARTIAL")) return "#8B949E";
    return "#3FB950";
  }

  function getSeverityColor(severity: Anomaly["severity"]): string {
    if (severity === "critical") return "#F85149";
    if (severity === "high") return "#E3B341";
    if (severity === "medium") return "#C8A94A";
    return "#8B949E";
  }

  function formatAnomalyType(type: string): string {
    return type
      .split("_")
      .map((part) => part.charAt(0).toUpperCase() + part.slice(1))
      .join(" ");
  }

  async function downloadReport() {
    setDownloading(true);
    try {
      const response = await fetch(`/api/v2/identity/report?hours=${hours}`);
      const blob = await response.blob();
      const url = URL.createObjectURL(blob);
      const anchor = document.createElement("a");
      anchor.href = url;
      anchor.download = `identity-report-${new Date().toISOString().split("T")[0]}.pdf`;
      document.body.appendChild(anchor);
      anchor.click();
      document.body.removeChild(anchor);
      URL.revokeObjectURL(url);
    } catch (error) {
      console.error("Report download error:", error);
    } finally {
      setDownloading(false);
    }
  }

  return (
    <div
      style={{
        padding: "24px",
        background: "#0D1117",
        minHeight: "100vh",
        fontFamily: "Inter, sans-serif",
      }}
    >
      <div
        style={{
          display: "flex",
          justifyContent: "space-between",
          alignItems: "center",
          marginBottom: "16px",
        }}
      >
        <div>
          <h1
            style={{
              color: "#E6EDF3",
              fontSize: "24px",
              fontWeight: "bold",
              margin: 0,
            }}
          >
            Identity Chain Analysis
          </h1>
          <p style={{ color: "#8B949E", margin: "4px 0 0" }}>
            Who - Device - Auth - Privilege - Action - Sequence
          </p>
        </div>

        <div style={{ display: "flex", gap: "12px" }}>
          <select
            value={hours}
            onChange={(event) => setHours(Number(event.target.value))}
            style={{
              background: "#161B22",
              border: "1px solid #30363D",
              color: "#E6EDF3",
              padding: "8px 16px",
              borderRadius: "6px",
              cursor: "pointer",
            }}
          >
            <option value={6}>Last 6 hours</option>
            <option value={24}>Last 24 hours</option>
            <option value={72}>Last 72 hours</option>
          </select>
          <button
            onClick={downloadReport}
            disabled={downloading}
            style={{
              background: "linear-gradient(135deg, #2DD4BF, #A78BFA)",
              color: "white",
              border: "none",
              padding: "8px 16px",
              borderRadius: "6px",
              cursor: downloading ? "not-allowed" : "pointer",
              fontWeight: "bold",
              opacity: downloading ? 0.7 : 1,
            }}
          >
            {downloading ? "Exporting..." : "Export PDF"}
          </button>
        </div>
      </div>

      <div style={{ display: "flex", gap: "8px", marginBottom: "24px" }}>
        <button
          type="button"
          onClick={() => setActiveTab("chains")}
          style={{
            border: "1px solid #30363D",
            borderRadius: "6px",
            padding: "8px 12px",
            cursor: "pointer",
            background: activeTab === "chains" ? "#2DD4BF" : "#161B22",
            color: activeTab === "chains" ? "#0D1117" : "#E6EDF3",
            fontWeight: 700,
          }}
        >
          Identity Chains
        </button>
        <button
          type="button"
          onClick={() => setActiveTab("anomalies")}
          style={{
            border: "1px solid #30363D",
            borderRadius: "6px",
            padding: "8px 12px",
            cursor: "pointer",
            background: activeTab === "anomalies" ? "#2DD4BF" : "#161B22",
            color: activeTab === "anomalies" ? "#0D1117" : "#E6EDF3",
            fontWeight: 700,
          }}
        >
          Anomalies
        </button>
      </div>

      {activeTab === "chains" && summary ? (
        <div
          style={{
            display: "grid",
            gridTemplateColumns: "repeat(4, 1fr)",
            gap: "16px",
            marginBottom: "24px",
          }}
        >
          {[
            {
              label: "Total Chains",
              value: summary.totalChains,
              color: "#2DD4BF",
            },
            { label: "High Risk", value: summary.highRisk, color: "#F85149" },
            {
              label: "Partial Graphs",
              value: summary.partialGraphs,
              color: "#E3B341",
            },
            {
              label: "Avg Confidence",
              value: `${summary.avgConfidence}%`,
              color: "#3FB950",
            },
          ].map((stat) => (
            <div
              key={stat.label}
              style={{
                background: "#161B22",
                border: "1px solid #30363D",
                borderRadius: "8px",
                padding: "16px",
              }}
            >
              <p
                style={{
                  color: "#8B949E",
                  fontSize: "12px",
                  margin: "0 0 8px",
                  textTransform: "uppercase",
                }}
              >
                {stat.label}
              </p>
              <p
                style={{
                  color: stat.color,
                  fontSize: "28px",
                  fontWeight: "bold",
                  margin: 0,
                }}
              >
                {stat.value}
              </p>
            </div>
          ))}
        </div>
      ) : null}

      {activeTab === "anomalies" ? (
        <div
          style={{
            display: "grid",
            gridTemplateColumns: "repeat(3, 1fr)",
            gap: "16px",
            marginBottom: "24px",
          }}
        >
          {[
            {
              label: "Critical",
              value: anomalyCounts.critical,
              color: "#F85149",
            },
            { label: "High", value: anomalyCounts.high, color: "#E3B341" },
            { label: "Medium", value: anomalyCounts.medium, color: "#C8A94A" },
          ].map((stat) => (
            <div
              key={stat.label}
              style={{
                background: "#161B22",
                border: `1px solid ${stat.color}`,
                borderRadius: "8px",
                padding: "16px",
              }}
            >
              <p
                style={{
                  color: "#8B949E",
                  fontSize: "12px",
                  margin: "0 0 8px",
                  textTransform: "uppercase",
                }}
              >
                {stat.label}
              </p>
              <p
                style={{
                  color: stat.color,
                  fontSize: "28px",
                  fontWeight: "bold",
                  margin: 0,
                }}
              >
                {stat.value}
              </p>
            </div>
          ))}
        </div>
      ) : null}

      {loading ? (
        <div style={{ textAlign: "center", color: "#8B949E", padding: "48px" }}>
          {activeTab === "chains"
            ? "Building identity chains..."
            : "Detecting anomalies..."}
        </div>
      ) : activeTab === "chains" ? (
        chains.length === 0 ? (
          <div
            style={{
              background: "#161B22",
              border: "1px solid #30363D",
              borderRadius: "8px",
              padding: "48px",
              textAlign: "center",
            }}
          >
            <p style={{ color: "#8B949E" }}>
              No identity chains found. Connect Microsoft Entra to start
              ingesting sign-in telemetry.
            </p>
          </div>
        ) : (
          <div
            style={{ display: "flex", flexDirection: "column", gap: "16px" }}
          >
            {chains.map((chain) => (
              <div
                key={chain.chainId}
                style={{
                  background: "#161B22",
                  border: `1px solid ${chain.isPartialGraph ? "#E3B341" : "#30363D"}`,
                  borderRadius: "8px",
                  padding: "20px",
                }}
              >
                <div
                  style={{
                    display: "flex",
                    justifyContent: "space-between",
                    alignItems: "center",
                    marginBottom: "16px",
                  }}
                >
                  <div>
                    <span
                      style={{
                        background: getVerdictBg(chain.verdict),
                        color: "white",
                        fontSize: "11px",
                        padding: "3px 8px",
                        borderRadius: "4px",
                        fontWeight: "bold",
                      }}
                    >
                      {chain.verdict}
                    </span>
                    {chain.isPartialGraph ? (
                      <span
                        style={{
                          marginLeft: "8px",
                          color: "#E3B341",
                          fontSize: "12px",
                        }}
                      >
                        Partial Graph
                      </span>
                    ) : null}
                  </div>

                  <div
                    style={{
                      display: "flex",
                      alignItems: "center",
                      gap: "8px",
                    }}
                  >
                    <span style={{ color: "#8B949E", fontSize: "12px" }}>
                      Confidence:
                    </span>
                    <span
                      style={{
                        color: getConfidenceColor(chain.overallConfidence),
                        fontWeight: "bold",
                      }}
                    >
                      {chain.overallConfidence}%
                    </span>
                  </div>
                </div>

                <div
                  style={{
                    display: "flex",
                    gap: "8px",
                    overflowX: "auto",
                    paddingBottom: "8px",
                  }}
                >
                  {chain.links.map((link, index) => (
                    <div
                      key={`${chain.chainId}-${index}`}
                      style={{
                        display: "flex",
                        alignItems: "center",
                        gap: "8px",
                        flexShrink: 0,
                      }}
                    >
                      <div
                        style={{
                          background: "#0D1117",
                          border: `1px solid ${getConfidenceColor(link.confidenceScore)}`,
                          borderRadius: "6px",
                          padding: "8px 12px",
                          fontSize: "12px",
                          color: "#E6EDF3",
                        }}
                      >
                        <div
                          style={{
                            color: "#8B949E",
                            textTransform: "uppercase",
                            fontSize: "10px",
                            marginBottom: "4px",
                          }}
                        >
                          {link.type}
                        </div>
                        <div
                          style={{
                            color: getConfidenceColor(link.confidenceScore),
                            fontWeight: "bold",
                          }}
                        >
                          {link.confidenceScore}%
                        </div>
                      </div>
                      {index < chain.links.length - 1 ? (
                        <span style={{ color: "#30363D" }}>-&gt;</span>
                      ) : null}
                    </div>
                  ))}
                </div>

                <div
                  style={{
                    marginTop: "12px",
                    fontSize: "11px",
                    color: "#8B949E",
                  }}
                >
                  Actor: {chain.actorId} | Type: {chain.actorType} | Links:{" "}
                  {chain.links.length}
                  {chain.startTime
                    ? ` | From: ${new Date(chain.startTime).toLocaleTimeString()}`
                    : ""}
                </div>
              </div>
            ))}
          </div>
        )
      ) : sortedAnomalies.length === 0 ? (
        <div
          style={{
            background: "#161B22",
            border: "1px solid #30363D",
            borderRadius: "8px",
            padding: "48px",
            textAlign: "center",
            color: "#8B949E",
          }}
        >
          No anomalies detected
        </div>
      ) : (
        <div style={{ display: "flex", flexDirection: "column", gap: "12px" }}>
          {sortedAnomalies.map((anomaly, index) => (
            <div
              key={`${anomaly.type}-${anomaly.timestamp}-${index}`}
              style={{
                background: "#161B22",
                border: "1px solid #30363D",
                borderLeft: `4px solid ${getSeverityColor(anomaly.severity)}`,
                borderRadius: "8px",
                padding: "16px",
              }}
            >
              <div
                style={{
                  display: "flex",
                  justifyContent: "space-between",
                  alignItems: "center",
                  marginBottom: "8px",
                  gap: "12px",
                }}
              >
                <div
                  style={{ display: "flex", alignItems: "center", gap: "8px" }}
                >
                  <span
                    style={{
                      background: getSeverityColor(anomaly.severity),
                      color: "#fff",
                      fontSize: "11px",
                      borderRadius: "4px",
                      padding: "2px 8px",
                      fontWeight: 700,
                      textTransform: "uppercase",
                    }}
                  >
                    {anomaly.severity}
                  </span>
                  <span
                    style={{
                      color: "#E6EDF3",
                      fontSize: "13px",
                      fontWeight: 700,
                    }}
                  >
                    {formatAnomalyType(anomaly.type)}
                  </span>
                </div>
                <span style={{ color: "#8B949E", fontSize: "12px" }}>
                  {new Date(anomaly.timestamp).toLocaleString()}
                </span>
              </div>
              <div style={{ color: "#E6EDF3", fontSize: "13px" }}>
                {anomaly.description}
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
