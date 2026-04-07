"use client";

import { useEffect, useState } from "react";
import { motion } from "framer-motion";
import type { TimelineEvent } from "@/lib/microsoft/timelineBuilder";
import PhishButton from "@/components/ui/PhishButton";

type MttrStats = {
  avgMinutes: number;
  minMinutes: number;
  maxMinutes: number;
  totalIncidents: number;
};

type AnomalyCounts = {
  critical: number;
  high: number;
  total: number;
};

type TimelineSummary = {
  totalEvents: number;
  timeRange: number;
  actorsInvolved: number;
};

export default function MTTRDashboardPage() {
  const [timeline, setTimeline] = useState<TimelineEvent[]>([]);
  const [mttr, setMttr] = useState<MttrStats | null>(null);
  const [anomalyCounts, setAnomalyCounts] = useState<AnomalyCounts | null>(
    null,
  );
  const [summary, setSummary] = useState<TimelineSummary | null>(null);
  const [loading, setLoading] = useState(true);
  const [hours, setHours] = useState(24);
  const [downloading, setDownloading] = useState(false);

  const containerVariants = {
    hidden: { opacity: 0 },
    visible: {
      opacity: 1,
      transition: { staggerChildren: 0.08 },
    },
  };
  const itemVariants = {
    hidden: { opacity: 0, y: 16 },
    visible: { opacity: 1, y: 0, transition: { duration: 0.35 } },
  };

  useEffect(() => {
    void fetchData();
  }, [hours]);

  async function fetchData() {
    setLoading(true);
    try {
      const response = await fetch(`/api/v2/identity/timeline?hours=${hours}`);
      const data = (await response.json()) as {
        timeline?: TimelineEvent[];
        mttr?: MttrStats;
        anomalyCounts?: AnomalyCounts;
        summary?: TimelineSummary;
      };

      setTimeline(data.timeline || []);
      setMttr(data.mttr || null);
      setAnomalyCounts(data.anomalyCounts || null);
      setSummary(data.summary || null);
    } catch (error) {
      console.error("MTTR fetch error:", error);
    } finally {
      setLoading(false);
    }
  }

  async function downloadReport() {
    setDownloading(true);
    try {
      const response = await fetch(`/api/v2/identity/report?hours=${hours}`);
      const blob = await response.blob();
      const url = URL.createObjectURL(blob);
      const anchor = document.createElement("a");
      anchor.href = url;
      anchor.download = `phish-slayer-identity-report-${new Date().toISOString().split("T")[0]}.pdf`;
      document.body.appendChild(anchor);
      anchor.click();
      document.body.removeChild(anchor);
      URL.revokeObjectURL(url);
    } catch (error) {
      console.error("Download error:", error);
    } finally {
      setDownloading(false);
    }
  }

  function getSeverityColor(severity: string): string {
    switch (severity) {
      case "critical":
        return "#F85149";
      case "high":
        return "#E3B341";
      case "medium":
        return "#A78BFA";
      case "low":
        return "#2DD4BF";
      default:
        return "#8B949E";
    }
  }

  function getTypeIcon(type: string): string {
    switch (type) {
      case "signin":
        return "🔐";
      case "privilege":
        return "⚡";
      case "action":
        return "🎯";
      case "alert":
        return "🚨";
      default:
        return "📋";
    }
  }

  function getDecayState(timestamp: string): {
    label: string;
    color: string;
  } {
    const elapsedMinutes =
      (Date.now() - new Date(timestamp).getTime()) / (1000 * 60);

    if (elapsedMinutes > 60) {
      return { label: "STALE", color: "#F85149" };
    }
    if (elapsedMinutes > 30) {
      return { label: "WARMING", color: "#E3B341" };
    }
    return { label: "FRESH", color: "#3FB950" };
  }

  return (
    <motion.div
      variants={containerVariants}
      initial="hidden"
      animate="visible"
      style={{
        padding: "24px",
        minHeight: "100vh",
        fontFamily: "Inter, sans-serif",
      }}
    >
      <div
        style={{
          display: "flex",
          justifyContent: "space-between",
          alignItems: "flex-start",
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
            MTTR &amp; Execution Timeline
          </h1>
          <p
            style={{
              color: "#8B949E",
              margin: "4px 0 0",
              fontSize: "13px",
            }}
          >
            Mean Time To Respond - Identity chain execution narrative
          </p>
        </div>
        <div style={{ display: "flex", gap: "12px" }}>
          <select
            value={hours}
            onChange={(event) => setHours(Number(event.target.value))}
            style={{
              background: "rgba(255,255,255,0.06)",
              border: "1px solid rgba(255,255,255,0.12)",
              color: "#E6EDF3",
              padding: "10px 18px",
              borderRadius: "12px",
              cursor: "pointer",
            }}
          >
            <option value={6}>Last 6 hours</option>
            <option value={24}>Last 24 hours</option>
            <option value={72}>Last 72 hours</option>
          </select>
          <PhishButton
            onClick={downloadReport}
            disabled={downloading}
            whileHover={{
              scale: 1.05,
              boxShadow: "0 0 28px rgba(45,212,191,0.5)",
            }}
            whileTap={{ scale: 0.96 }}
            transition={{ type: "spring", stiffness: 400, damping: 17 }}
            style={{
              background: "linear-gradient(135deg,#2DD4BF,#22c55e)",
              color: "#000",
              border: "none",
              padding: "10px 24px",
              borderRadius: "9999px",
              cursor: downloading ? "not-allowed" : "pointer",
              fontWeight: 700,
              opacity: downloading ? 0.7 : 1,
            }}
          >
            {downloading ? "Generating..." : "📄 Export PDF"}
          </PhishButton>
        </div>
      </div>

      {mttr ? (
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
              label: "Avg MTTR",
              value: mttr.avgMinutes > 0 ? `${mttr.avgMinutes}m` : "N/A",
              color: mttr.avgMinutes > 60 ? "#F85149" : "#3FB950",
              sub: "minutes to respond",
            },
            {
              label: "Total Incidents",
              value: mttr.totalIncidents,
              color: "#2DD4BF",
              sub: `in last ${hours}h`,
            },
            {
              label: "Critical Anomalies",
              value: anomalyCounts?.critical || 0,
              color: (anomalyCounts?.critical || 0) > 0 ? "#F85149" : "#3FB950",
              sub: "require immediate action",
            },
            {
              label: "Timeline Events",
              value: summary?.totalEvents || 0,
              color: "#A78BFA",
              sub: "total events tracked",
            },
          ].map((card) => (
            <motion.div
              key={card.label}
              variants={itemVariants}
              whileHover={{
                scale: 1.02,
                background: "rgba(23,28,35,0.88)",
                boxShadow: "0 8px 32px rgba(45,212,191,0.12)",
                borderColor: "rgba(45,212,191,0.3)",
              }}
              transition={{ type: "spring", stiffness: 300, damping: 20 }}
              style={{
                background: "rgba(23,28,35,0.75)",
                border: "1px solid rgba(48,54,61,0.7)",
                backdropFilter: "blur(12px)",
                borderRadius: "12px",
                padding: "20px",
              }}
            >
              <p
                style={{
                  color: "#8B949E",
                  fontSize: "11px",
                  margin: "0 0 8px",
                  textTransform: "uppercase",
                  letterSpacing: "1px",
                }}
              >
                {card.label}
              </p>
              <p
                style={{
                  color: card.color,
                  fontSize: "32px",
                  fontWeight: "bold",
                  margin: "0 0 4px",
                }}
              >
                {card.value}
              </p>
              <p
                style={{
                  color: "#8B949E",
                  fontSize: "11px",
                  margin: 0,
                }}
              >
                {card.sub}
              </p>
            </motion.div>
          ))}
        </div>
      ) : null}

      <div
        data-card="large"
        style={{
          background: "rgba(23,28,35,0.8)",
          border: "1px solid rgba(48,54,61,0.7)",
          backdropFilter: "blur(10px)",
          borderRadius: "16px",
          padding: "24px",
        }}
      >
        <h2
          style={{
            color: "#E6EDF3",
            fontSize: "16px",
            fontWeight: "bold",
            margin: "0 0 20px",
          }}
        >
          Execution Narrative
          <span
            style={{
              color: "#8B949E",
              fontSize: "12px",
              fontWeight: "normal",
              marginLeft: "8px",
            }}
          >
            Who - Device - Auth - Privilege - Action - Sequence
          </span>
        </h2>

        {loading ? (
          <div
            style={{
              textAlign: "center",
              color: "#8B949E",
              padding: "48px",
            }}
          >
            Building execution timeline...
          </div>
        ) : timeline.length === 0 ? (
          <div
            style={{
              textAlign: "center",
              color: "#8B949E",
              padding: "48px",
            }}
          >
            <p>No timeline events in the last {hours} hours.</p>
            <p style={{ fontSize: "12px", marginTop: "8px" }}>
              Connect Microsoft Entra to start ingesting identity telemetry.
            </p>
          </div>
        ) : (
          <div style={{ position: "relative", paddingLeft: "24px" }}>
            <div
              style={{
                position: "absolute",
                left: "8px",
                top: 0,
                bottom: 0,
                width: "2px",
                background: "rgba(255,255,255,0.1)",
              }}
            />

            {timeline.map((event) => (
              <div
                key={event.id}
                style={{
                  position: "relative",
                  marginBottom: "16px",
                  paddingLeft: "24px",
                }}
              >
                <div
                  style={{
                    position: "absolute",
                    left: "-20px",
                    top: "8px",
                    width: "12px",
                    height: "12px",
                    borderRadius: "50%",
                    background: getSeverityColor(event.severity),
                    border: "2px solid rgba(255,255,255,0.05)",
                  }}
                />

                <motion.div
                  variants={itemVariants}
                  title={event.explanation?.summary || ""}
                  style={{
                    background: "#09121E",
                    border: `1px solid ${getSeverityColor(event.severity)}33`,
                    borderRadius: "12px",
                    padding: "12px 16px",
                  }}
                >
                  <div
                    style={{
                      display: "flex",
                      justifyContent: "space-between",
                      alignItems: "flex-start",
                      marginBottom: "6px",
                    }}
                  >
                    <div
                      style={{
                        display: "flex",
                        alignItems: "center",
                        gap: "8px",
                      }}
                    >
                      <span>{getTypeIcon(event.type)}</span>
                      <span
                        style={{
                          color: "#E6EDF3",
                          fontWeight: "bold",
                          fontSize: "13px",
                        }}
                      >
                        {event.title}
                      </span>
                      <span
                        style={{
                          background: getSeverityColor(event.severity) + "22",
                          color: getSeverityColor(event.severity),
                          fontSize: "10px",
                          padding: "2px 6px",
                          borderRadius: "4px",
                          fontWeight: "bold",
                        }}
                      >
                        {event.severity.toUpperCase()}
                      </span>
                      {event.isPartOfPartialGraph ? (
                        <span
                          style={{
                            color: "#E3B341",
                            fontSize: "10px",
                          }}
                        >
                          ⚠ Partial
                        </span>
                      ) : null}
                    </div>
                    <div
                      style={{
                        display: "flex",
                        alignItems: "center",
                        gap: "12px",
                      }}
                    >
                      {(() => {
                        const decay = getDecayState(event.timestamp);

                        return (
                          <>
                            <span
                              style={{
                                color: "#8B949E",
                                fontSize: "11px",
                              }}
                            >
                              Confidence: {event.confidenceScore}%
                            </span>
                            <span
                              style={{
                                border: `1px solid ${decay.color}55`,
                                color: decay.color,
                                fontSize: "10px",
                                borderRadius: "4px",
                                padding: "1px 6px",
                                fontWeight: "bold",
                              }}
                            >
                              {decay.label}
                            </span>
                          </>
                        );
                      })()}
                      <span
                        style={{
                          color: "#8B949E",
                          fontSize: "11px",
                        }}
                      >
                        {new Date(event.timestamp).toLocaleTimeString()}
                      </span>
                    </div>
                  </div>
                  <p
                    style={{
                      color: "#8B949E",
                      fontSize: "12px",
                      margin: 0,
                    }}
                  >
                    {event.description}
                    {event.deviceName ? ` | Device: ${event.deviceName}` : ""}
                    {event.mfaMethod ? ` | MFA: ${event.mfaMethod}` : ""}
                  </p>
                </motion.div>
              </div>
            ))}
          </div>
        )}
      </div>

      <div
        style={{
          marginTop: "16px",
          background: "rgba(23,28,35,0.8)",
          border: "1px solid rgba(48,54,61,0.7)",
          backdropFilter: "blur(10px)",
          borderRadius: "16px",
          padding: "16px",
        }}
      >
        <h3
          style={{
            color: "#E6EDF3",
            margin: "0 0 10px",
            fontSize: "13px",
            fontWeight: 700,
          }}
        >
          Confidence Model
        </h3>
        <div style={{ color: "#8B949E", fontSize: "12px" }}>
          Base confidence uses asymmetric signal weights where device binding
          and MFA contribute more than IP or geolocation.
        </div>
        <div style={{ color: "#8B949E", fontSize: "12px", marginTop: "4px" }}>
          Exponential decay applies with a 30-minute half-life; stale links are
          down-weighted until revalidation refreshes confidence.
        </div>
      </div>
    </motion.div>
  );
}