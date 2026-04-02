"use client";

import { useEffect, useState } from "react";
import type { IdentityChain } from "@/lib/microsoft/types";

type ChainSummary = {
  totalChains: number;
  highRisk: number;
  partialGraphs: number;
  avgConfidence: number;
};

export default function IdentityDashboardPage() {
  const [chains, setChains] = useState<IdentityChain[]>([]);
  const [summary, setSummary] = useState<ChainSummary | null>(null);
  const [loading, setLoading] = useState(true);
  const [hours, setHours] = useState(24);

  useEffect(() => {
    void fetchChains();
  }, [hours]);

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
          marginBottom: "24px",
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
      </div>

      {summary && (
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
      )}

      {loading ? (
        <div style={{ textAlign: "center", color: "#8B949E", padding: "48px" }}>
          Building identity chains...
        </div>
      ) : chains.length === 0 ? (
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
            No identity chains found. Connect Microsoft Entra to start ingesting
            sign-in telemetry.
          </p>
        </div>
      ) : (
        <div style={{ display: "flex", flexDirection: "column", gap: "16px" }}>
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
                  {chain.isPartialGraph && (
                    <span
                      style={{
                        marginLeft: "8px",
                        color: "#E3B341",
                        fontSize: "12px",
                      }}
                    >
                      Partial Graph
                    </span>
                  )}
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
                    {index < chain.links.length - 1 && (
                      <span style={{ color: "#30363D" }}>-&gt;</span>
                    )}
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
      )}
    </div>
  );
}
