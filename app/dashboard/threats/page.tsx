"use client";

import { useState, useEffect, useTransition } from "react";
import { motion } from "framer-motion";
import { useRouter } from "next/navigation";
import {
  ShieldAlert,
  CheckCircle2,
  Activity,
  AlertTriangle,
  Code,
  Ban,
  Loader2,
  Radar,
  ImageOff,
  FileDown,
  ChevronDown,
  Gavel,
  Send,
} from "lucide-react";
import { toast } from "sonner";
import {
  getScans,
  createIncident,
  addToWhitelist,
} from "@/lib/supabase/actions";
import { useThreatStore } from "@/lib/stores/threatStore";
import { useHeuristicStore } from "@/lib/stores/heuristicStore";
import {
  WhoisPanel,
  GhostMailPanel,
  SslPanel,
  TyposquatPanel,
  DomTreePanel,
} from "./DeepScanPanels";
import AIHeuristicsPanel from "./AIHeuristicsPanel";
import PortPatrolPanel from "./PortPatrolPanel";
import TakedownModal from "./TakedownModal";
import { canAccessFeature, type SubscriptionTier } from "@/lib/rbac/planGating";
import { createClient } from "@/lib/supabase/client";
import { useTier } from "@/hooks/useTier";
import PhishButton from "@/components/ui/PhishButton";

type ScanRecord = {
  id?: string;
  target: string;
  status: string;
  date: string;
  verdict?: string;
  malicious_count?: number;
  total_engines?: number;
  ai_summary?: string;
  risk_score?: number;
  threat_category?: string;
};

const TABS = [
  { key: "rendered", label: "RENDERED VIEW" },
  { key: "domtree", label: "DOM TREE" },
  { key: "whois", label: "WHOIS" },
  { key: "ghostmail", label: "GHOST MAIL" },
  { key: "ssl", label: "SSL PROFILE" },
  { key: "typosquat", label: "TYPOSQUAT" },
  { key: "ai-heuristics", label: "AI HEURISTICS" },
  { key: "port-patrol", label: "PORT PATROL" },
] as const;

export default function ThreatIntelligencePage() {
  const router = useRouter();
  const [isPendingAction, startActionTransition] = useTransition();
  const [scan, setScan] = useState<ScanRecord | null>(null);
  const [allScans, setAllScans] = useState<ScanRecord[]>([]);
  const [loaded, setLoaded] = useState(false);
  const [isWhitelisted, setIsWhitelisted] = useState(false);
  const [imageLoaded, setImageLoaded] = useState(false);
  const [deepScanError, setDeepScanError] = useState<string | null>(null);
  const [selectorOpen, setSelectorOpen] = useState(false);
  const [takedownOpen, setTakedownOpen] = useState(false);
  const [siemPushing, setSiemPushing] = useState(false);
  const heuristicStore = useHeuristicStore();
  const [userTier, setUserTier] = useState<SubscriptionTier>("free");
  const { limits, isSuperAdmin } = useTier();

  const {
    activeTab,
    setActiveTab,
    deepScanData,
    setDeepScanData,
    deepScanLoading,
    setDeepScanLoading,
  } = useThreatStore();

  // Fetch most recent completed scan
  useEffect(() => {
    getScans()
      .then((rows) => {
        const completed = (rows as ScanRecord[]).filter(
          (r) => r.status === "Completed",
        );
        if (completed.length === 0) {
          setScan(null);
          return;
        }
        completed.sort(
          (a, b) => new Date(b.date).getTime() - new Date(a.date).getTime(),
        );
        setAllScans(completed.slice(0, 10));
        setScan(completed[0]);
        setImageLoaded(false);
      })
      .catch(() => {})
      .finally(() => setLoaded(true));

    // Fetch user subscription tier
    const sb = createClient();
    sb.auth.getUser().then(({ data: { user } }) => {
      if (user) {
        sb.from("profiles")
          .select("subscription_tier")
          .eq("id", user.id)
          .single()
          .then(({ data }) => {
            if (data?.subscription_tier)
              setUserTier(data.subscription_tier as SubscriptionTier);
          });
      }
    });
  }, []);

  // Auto-trigger deep scan when scan is available
  useEffect(() => {
    if (!scan?.target) return;
    setDeepScanLoading(true);
    setDeepScanError(null);
    fetch(`/api/deep-scan?target=${encodeURIComponent(scan.target)}`)
      .then((res) => res.json())
      .then((data) => setDeepScanData(data))
      .catch((err) => setDeepScanError(err.message || "Deep scan failed"))
      .finally(() => setDeepScanLoading(false));
  }, [scan?.target, setDeepScanData, setDeepScanLoading]);

  if (!loaded) {
    return (
      <div className="flex items-center justify-center min-h-[60vh]">
        <Loader2 className="w-8 h-8 animate-spin text-blue-600" />
      </div>
    );
  }
  if (!scan) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[60vh] text-center px-4">
        <Radar className="w-16 h-16 text-[#8B949E] mb-4" />
        <h2 className="dashboard-section-heading text-white mb-2">
          No threat data available
        </h2>
        <p className="text-sm text-[#8B949E] max-w-md">
          Run a scan from the{" "}
          <a
            href="/dashboard/scans"
            className="text-[#2DD4BF] font-semibold hover:underline"
          >
            Scans
          </a>{" "}
          page first. The most recent completed scan will automatically appear
          here for deep analysis.
        </p>
      </div>
    );
  }

  const riskScore = scan.risk_score ?? 0;
  const priorityLabel =
    riskScore >= 80
      ? "Priority 1"
      : riskScore >= 50
        ? "Priority 2"
        : "Priority 3";
  const verdictLabel = scan.verdict || "Unknown";
  const verdictColor =
    verdictLabel.toLowerCase() === "malicious"
      ? "text-[#F85149]"
      : verdictLabel.toLowerCase() === "clean"
        ? "text-[#3FB950]"
        : "text-[#E3B341]";
  const threatTag = scan.threat_category || "Unclassified";
  const malicious = scan.malicious_count ?? 0;
  const totalEngines = scan.total_engines ?? 0;
  const scanDate = scan.date
    ? new Date(scan.date).toLocaleString("en-US", {
        month: "short",
        day: "numeric",
        year: "numeric",
        hour: "2-digit",
        minute: "2-digit",
        timeZoneName: "short",
      })
    : "—";

  const analysisPayload = {
    target: scan.target,
    verdict: verdictLabel,
    risk_score: riskScore,
    threat_category: threatTag,
    malicious_engines: `${malicious} / ${totalEngines}`,
    ai_summary: scan.ai_summary || "No AI analysis available.",
    scan_date: scan.date,
  };

  const theme =
    riskScore >= 70
      ? {
          text: "text-[#F85149]",
          bg: "bg-[#F85149]",
          bgLight: "bg-[#F85149]/10",
          border: "border-[#F85149]",
          ring: "ring-red-500/20",
        }
      : riskScore >= 40
        ? {
            text: "text-[#E3B341]",
            bg: "bg-[#E3B341]",
            bgLight: "bg-[#E3B341]/10",
            border: "border-[#E3B341]",
            ring: "ring-orange-500/20",
          }
        : {
            text: "text-[#3FB950]",
            bg: "bg-[#3FB950]",
            bgLight: "bg-[#3FB950]/10",
            border: "border-[#3FB950]",
            ring: "ring-emerald-500/20",
          };

  const handleTakeAction = () => {
    if (!scan) return;
    startActionTransition(async () => {
      try {
        const result = await createIncident({
          title: `Threat Detected: ${scan.target}`,
          severity:
            riskScore >= 80 ? "Critical" : riskScore >= 50 ? "High" : "Medium",
          status: "Open Investigations",
          description: `Automatically escalated from Threat Scanner.\nTarget: ${scan.target}\nRisk Score: ${riskScore}\nVerdict: ${verdictLabel}\nCategory: ${threatTag}`,
        });
        if (result?.error) {
          toast.error(result.error);
          return;
        }
        toast.success("Threat escalated to Incident Reports.");
        router.push("/dashboard/incidents");
      } catch (err: unknown) {
        const message =
          err instanceof Error ? err.message : "Failed to escalate threat";
        toast.error(message);
      }
    });
  };

  const handleWhitelist = () => {
    if (!scan) return;
    startActionTransition(async () => {
      try {
        const result = await addToWhitelist(scan.target);
        if (result?.error) {
          toast.error(result.error);
          return;
        }
        toast.success("Target added to whitelist.");
        setIsWhitelisted(true);
      } catch (err: unknown) {
        const message =
          err instanceof Error ? err.message : "Failed to add to whitelist.";
        toast.error(message);
      }
    });
  };

  const generatePDF = async () => {
    if (!scan) return;
    const { default: jsPDF } = await import("jspdf");
    const { default: autoTable } = await import("jspdf-autotable");
    const doc = new jsPDF("p", "mm", "a4");
    const w = doc.internal.pageSize.getWidth();
    doc.setFillColor(15, 23, 42);
    doc.rect(0, 0, w, 38, "F");
    doc.setFillColor(13, 148, 136);
    doc.rect(0, 38, w, 3, "F");
    doc.setFont("helvetica", "bold");
    doc.setFontSize(22);
    doc.setTextColor(255, 255, 255);
    doc.text("PHISH-SLAYER", 15, 18);
    doc.setFontSize(9);
    doc.setFont("helvetica", "normal");
    doc.setTextColor(148, 163, 184);
    doc.text("Executive Threat Report", 15, 26);
    doc.text(`Generated: ${new Date().toLocaleString()}`, 15, 32);
    doc.setFillColor(239, 68, 68);
    doc.roundedRect(w - 55, 12, 42, 9, 2, 2, "F");
    doc.setFontSize(7);
    doc.setFont("helvetica", "bold");
    doc.setTextColor(255, 255, 255);
    doc.text("CONFIDENTIAL", w - 50, 18);
    let y = 52;
    doc.setFontSize(10);
    doc.setFont("helvetica", "bold");
    doc.setTextColor(100, 116, 139);
    doc.text("TARGET", 15, y);
    y += 6;
    doc.setFontSize(16);
    doc.setTextColor(15, 23, 42);
    doc.text(scan.target, 15, y);
    y += 12;
    const vIsMalicious = scan.verdict?.toLowerCase() === "malicious";
    doc.setFillColor(
      vIsMalicious ? 254 : 236,
      vIsMalicious ? 242 : 253,
      vIsMalicious ? 242 : 245,
    );
    doc.roundedRect(15, y, w - 30, 22, 3, 3, "F");
    doc.setFontSize(10);
    doc.setFont("helvetica", "bold");
    doc.setTextColor(100, 116, 139);
    doc.text("VERDICT", 20, y + 8);
    doc.setFontSize(14);
    doc.setTextColor(
      vIsMalicious ? 220 : 5,
      vIsMalicious ? 38 : 150,
      vIsMalicious ? 38 : 105,
    );
    doc.text((scan.verdict || "Unknown").toUpperCase(), 20, y + 17);
    doc.setFontSize(10);
    doc.setTextColor(100, 116, 139);
    doc.text("RISK SCORE", w / 2 + 10, y + 8);
    doc.setFontSize(14);
    doc.setTextColor(15, 23, 42);
    doc.text(`${riskScore} / 100`, w / 2 + 10, y + 17);
    y += 30;
    doc.setFontSize(10);
    doc.setFont("helvetica", "bold");
    doc.setTextColor(100, 116, 139);
    doc.text("THREAT CATEGORY", 15, y);
    y += 6;
    doc.setFontSize(11);
    doc.setTextColor(15, 23, 42);
    doc.text(threatTag, 15, y);
    y += 12;
    doc.setFontSize(10);
    doc.setFont("helvetica", "bold");
    doc.setTextColor(100, 116, 139);
    doc.text("AI THREAT ANALYSIS", 15, y);
    y += 6;
    doc.setFontSize(9);
    doc.setFont("helvetica", "normal");
    doc.setTextColor(51, 65, 85);
    const summaryLines = doc.splitTextToSize(
      scan.ai_summary || "No AI analysis available.",
      w - 30,
    );
    doc.text(summaryLines, 15, y);
    y += summaryLines.length * 4.5 + 8;
    autoTable(doc, {
      startY: y,
      head: [["Metric", "Value"]],
      body: [
        ["Malicious Engines", `${malicious} / ${totalEngines}`],
        [
          "Detection Rate",
          totalEngines > 0
            ? `${((malicious / totalEngines) * 100).toFixed(1)}%`
            : "N/A",
        ],
        ["Priority Level", priorityLabel],
        ["Scan Date", scanDate],
      ],
      theme: "grid",
      headStyles: {
        fillColor: [13, 148, 136],
        textColor: [255, 255, 255],
        fontStyle: "bold",
        fontSize: 9,
      },
      bodyStyles: { fontSize: 9, textColor: [51, 65, 85] },
      alternateRowStyles: { fillColor: [248, 250, 252] },
      margin: { left: 15, right: 15 },
    });
    const pageH = doc.internal.pageSize.getHeight();
    doc.setFillColor(248, 250, 252);
    doc.rect(0, pageH - 18, w, 18, "F");
    doc.setFontSize(7);
    doc.setFont("helvetica", "normal");
    doc.setTextColor(148, 163, 184);
    doc.text(
      "Phish-Slayer Enterprise Security • Confidential • For authorized recipients only",
      w / 2,
      pageH - 8,
      { align: "center" },
    );
    doc.save(
      `phish-slayer-report-${scan.target.replace(/[^a-zA-Z0-9]/g, "_")}.pdf`,
    );
    toast.success("Executive Report downloaded.");
  };

  // Rendered view content (existing sandbox + source analysis)
  const renderRenderedView = () => (
    <div className="flex-1 grid grid-cols-1 xl:grid-cols-2 gap-0 min-h-[400px]">
      {/* Visual Sandbox */}
      <div className="flex-1 bg-black/80 p-6 flex flex-col items-center justify-center relative border-r border-white/10">
        <div className="w-full max-w-md bg-white/5 rounded-2xl shadow-md overflow-hidden border border-[rgba(48,54,61,0.9)] relative">
          <div className="bg-black/80 border-b border-white/10 p-2.5 flex items-center justify-between">
            <div className="flex gap-1.5">
              <div className="w-2.5 h-2.5 rounded-full bg-slate-300"></div>
              <div className="w-2.5 h-2.5 rounded-full bg-slate-300"></div>
            </div>
            <div className="bg-white/5 px-3 py-1 rounded-md text-[9px] text-[#8B949E] font-mono w-2/3 truncate text-center shadow-sm">
              {scan.target}
            </div>
            <div className="w-8"></div>
          </div>
          <div className="aspect-[4/3] relative bg-black">
            {/^(?:\d{1,3}\.){3}\d{1,3}$/.test(scan.target) ? (
              <div className="absolute inset-0 flex flex-col items-center justify-center p-8 text-center bg-black/80">
                <ImageOff className="w-10 h-10 text-white mb-3" />
                <h4 className="text-sm font-bold text-[#8B949E] mb-1">
                  Sandbox unavailable for raw IP addresses.
                </h4>
                <p className="text-xs text-[#8B949E] max-w-[220px] leading-relaxed">
                  Visual rendering requires a resolvable domain. Analysis data
                  is still available in the panels.
                </p>
              </div>
            ) : (
              <>
                {!imageLoaded && (
                  <div className="absolute inset-0 flex flex-col items-center justify-center p-8 text-center bg-black/80 z-10 animate-pulse">
                    <Loader2 className="w-8 h-8 animate-spin text-[#14B8A6] mb-4" />
                    <h4 className="text-sm font-bold text-[#8B949E] mb-1.5">
                      Generating Sandbox...
                    </h4>
                    <p className="text-xs text-[#8B949E] max-w-[200px] leading-relaxed">
                      Acquiring live snapshot via secure tunnel.
                    </p>
                  </div>
                )}
                <img
                  src={`https://image.thum.io/get/width/1200/crop/800/https://${scan.target}`}
                  alt={`Live snapshot of ${scan.target}`}
                  className={`absolute inset-0 w-full h-full object-cover transition-opacity duration-500 ${imageLoaded ? "opacity-100" : "opacity-0"}`}
                  onLoad={() => setImageLoaded(true)}
                  onError={() => setImageLoaded(true)}
                />
              </>
            )}
            <div
              className={`absolute inset-0 ${theme.bgLight} pointer-events-none opacity-20`}
            >
              <div
                className={`absolute left-0 w-full h-[2px] ${theme.bg} shadow-[0_0_12px_rgba(0,0,0,0.3)] animate-[scan_2s_ease-in-out_infinite]`}
              ></div>
            </div>
            {riskScore >= 40 && (
              <div
                className={`absolute top-[55%] left-1/2 -translate-x-1/2 w-[85%] border-2 ${theme.border} bg-white/5 rounded-[6px] p-2 animate-pulse shadow-lg`}
              >
                <div className="flex items-center gap-2">
                  <AlertTriangle className={`w-4 h-4 ${theme.text}`} />
                  <span
                    className={`text-[10px] font-black ${theme.text} uppercase`}
                  >
                    {threatTag}
                  </span>
                </div>
              </div>
            )}
          </div>
        </div>
        <div className="mt-8 flex flex-col items-center text-center">
          <span className="text-[11px] font-semibold text-[#8B949E] flex items-center gap-2">
            Scanned: {scanDate}
          </span>
        </div>
      </div>
      {/* Source Analysis */}
      <div className="w-full flex flex-col bg-white/5 text-white font-mono text-[11px] overflow-hidden">
        <div className="bg-black/50 px-4 py-3 border-b border-white/10 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Code className="w-4 h-4 text-[#2DD4BF]" />
            <span className="text-[10px] font-black text-[#8B949E] uppercase tracking-widest">
              Source Analysis
            </span>
          </div>
          <span className="text-[10px] text-[#8B949E]">JSON payload</span>
        </div>
        <div className="flex-1 overflow-auto p-4 scrollbar-thin scrollbar-thumb-slate-700">
          <pre className="text-[11px] leading-relaxed whitespace-pre-wrap text-white">
            {JSON.stringify(analysisPayload, null, 2)}
          </pre>
        </div>
        <div
          className={`p-4 border-t ${riskScore >= 70 ? "bg-[#F85149] border-[#F85149]" : riskScore >= 40 ? "bg-[#E3B341] border-[#E3B341]" : "bg-[#3FB950] border-[#3FB950]"}`}
        >
          <div className="flex items-start gap-3">
            <div className="bg-white/20 p-1 rounded">
              <ShieldAlert className="w-5 h-5 text-white" />
            </div>
            <div>
              <h4 className="text-white font-black text-xs leading-none mb-1">
                {riskScore >= 70
                  ? "HIGH RISK DETECTED"
                  : riskScore >= 40
                    ? "MODERATE RISK"
                    : "LOW RISK"}
              </h4>
              <p className="text-white/90 text-[10px] leading-tight font-medium">
                {scan.ai_summary
                  ? scan.ai_summary.slice(0, 120) +
                    (scan.ai_summary.length > 120 ? "…" : "")
                  : "No detailed analysis available for this scan."}
              </p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );

  // Tab content based on active tab
  const renderTabContent = () => {
    switch (activeTab) {
      case "rendered":
        return renderRenderedView();
      case "whois":
        return (
          <div className="p-4 min-h-[400px]">
            <WhoisPanel data={deepScanData} loading={deepScanLoading} />
          </div>
        );
      case "ghostmail":
        return (
          <div className="p-4 min-h-[400px]">
            <GhostMailPanel data={deepScanData} loading={deepScanLoading} />
          </div>
        );
      case "ssl":
        return (
          <div className="p-4 min-h-[400px]">
            <SslPanel data={deepScanData} loading={deepScanLoading} />
          </div>
        );
      case "typosquat":
        return (
          <div className="p-4 min-h-[400px]">
            <TyposquatPanel data={deepScanData} loading={deepScanLoading} />
          </div>
        );
      case "domtree":
        return (
          <div className="p-4 min-h-[400px]">
            <DomTreePanel data={deepScanData} loading={deepScanLoading} />
          </div>
        );
      case "ai-heuristics":
        if (!canAccessFeature(userTier, "aiHeuristics")) {
          return (
            <div className="p-8 min-h-[400px] flex flex-col items-center justify-center gap-4 text-center">
              <div className="w-16 h-16 rounded-2xl bg-violet-500/10 flex items-center justify-center">
                <span className="text-2xl">🔒</span>
              </div>
              <h3 className="text-lg font-bold text-white">
                AI Heuristics Engine
              </h3>
              <p className="text-sm text-[#8B949E] max-w-sm">
                AI-powered behavioral analysis requires a Pro or Enterprise
                plan.
              </p>
              <a
                href="/pricing"
                className="rounded-full px-[30px] py-[14px] bg-violet-600 text-white text-sm font-bold hover:bg-violet-700 transition-colors"
              >
                Upgrade Now
              </a>
            </div>
          );
        }
        return (
          <div className="p-4 min-h-[400px]">
            <AIHeuristicsPanel
              target={scan?.target || ""}
              existingRiskScore={riskScore}
            />
          </div>
        );
      case "port-patrol":
        if (!canAccessFeature(userTier, "portPatrol")) {
          return (
            <div className="p-8 min-h-[400px] flex flex-col items-center justify-center gap-4 text-center">
              <div className="w-16 h-16 rounded-2xl bg-[#E3B341]/10 flex items-center justify-center">
                <span className="text-2xl">🔒</span>
              </div>
              <h3 className="text-lg font-bold text-white">Port Patrol</h3>
              <p className="text-sm text-[#8B949E] max-w-sm">
                Active port reconnaissance requires a Pro or Enterprise plan.
              </p>
              <a
                href="/pricing"
                className="rounded-full px-[30px] py-[14px] bg-[#E3B341] text-white text-sm font-bold hover:bg-orange-700 transition-colors"
              >
                Upgrade Now
              </a>
            </div>
          );
        }
        return (
          <div className="p-4 min-h-[400px]">
            <PortPatrolPanel target={scan?.target || ""} />
          </div>
        );
      default:
        return renderRenderedView();
    }
  };

  const allRiskFlags = deepScanData?.allRiskFlags || [];

  return (
    <div className="text-white font-sans min-h-screen flex flex-col w-full">
      {/* Threat Header */}
      <div className="sticky top-4 sm:top-6 z-40 w-full max-w-7xl mx-auto px-4 sm:px-6 pointer-events-none">
        <motion.section
          whileHover={{
            scale: 1.005,
            boxShadow: "0 8px 32px rgba(45,212,191,0.15)",
          }}
          transition={{ type: "spring", stiffness: 300, damping: 20 }}
          className="liquid-glass bg-white/5 backdrop-blur shadow-[inset_0_1px_1px_rgba(255,255,255,0.05)] border border-[rgba(48,54,61,0.9)] rounded-2xl px-6 py-4 pointer-events-auto"
        >
          <div className="flex flex-col lg:flex-row items-center justify-between gap-6">
            <div className="flex items-center gap-6 w-full lg:w-auto">
              <div className="flex flex-col">
                <div className="flex items-center gap-2 mb-1">
                  <span
                    className={`text-[10px] font-black text-white px-2 py-0.5 rounded-sm uppercase ${theme.bg}`}
                  >
                    {priorityLabel}
                  </span>
                  <span className="text-xs text-[#8B949E] font-medium tracking-wide">
                    {scan.id ? `ID-${String(scan.id).slice(0, 8)}` : "—"} •{" "}
                    {verdictLabel}
                  </span>
                </div>
                <div className="flex items-center gap-2">
                  <h1 className="text-xl md:text-2xl font-black text-white tracking-tight leading-none truncate max-w-lg">
                    {scan.target}
                  </h1>
                  {allScans.length > 1 && (
                    <div className="relative">
                      <PhishButton
                        onClick={() => setSelectorOpen(!selectorOpen)}
                        className="flex items-center gap-1 px-2 py-1 rounded-md border border-[rgba(48,54,61,0.9)] bg-white/10 hover:bg-white/10 text-white transition-colors"
                        aria-label="Select scan"
                      >
                        <ChevronDown
                          className={`w-4 h-4 transition-transform ${selectorOpen ? "rotate-180" : ""}`}
                        />
                      </PhishButton>
                      {selectorOpen && (
                        <div className="absolute top-full left-0 mt-2 w-80 bg-white/5 border border-[rgba(48,54,61,0.9)] rounded-2xl shadow-xl z-50 overflow-hidden">
                          <div className="px-3 py-2 border-b border-white/10 bg-white/5">
                            <span className="text-[10px] font-black text-[#8B949E] uppercase tracking-widest">
                              Recent Scans
                            </span>
                          </div>
                          <div className="max-h-64 overflow-y-auto scrollbar-thin scrollbar-thumb-slate-700">
                            {allScans.map((s, i) => (
                              <PhishButton
                                key={s.id || i}
                                onClick={() => {
                                  setScan(s);
                                  setImageLoaded(false);
                                  setIsWhitelisted(false);
                                  setSelectorOpen(false);
                                }}
                                className={`w-full text-left px-3 py-2.5 hover:bg-white/10 transition-colors border-b border-white/10 last:border-b-0 ${
                                  s.id === scan.id ? "bg-[#2DD4BF]/10" : ""
                                }`}
                              >
                                <div className="flex items-center justify-between">
                                  <span
                                    className={`font-mono text-xs font-bold truncate max-w-[180px] ${s.id === scan.id ? "text-[#2DD4BF]" : "text-white"}`}
                                  >
                                    {s.target}
                                  </span>
                                  <div className="flex items-center gap-2">
                                    <span
                                      className={`text-[9px] font-black px-1.5 py-0.5 rounded ${
                                        s.verdict?.toLowerCase() === "malicious"
                                          ? "bg-[#F85149]/10 text-[#F85149]"
                                          : s.verdict?.toLowerCase() === "clean"
                                            ? "bg-[#3FB950]/10 text-[#3FB950]"
                                            : "bg-[#E3B341]/10 text-[#E3B341]"
                                      }`}
                                    >
                                      {s.verdict?.toUpperCase() || "UNKNOWN"}
                                    </span>
                                    <span className="text-[10px] font-mono text-[#8B949E]">
                                      {s.risk_score ?? 0}
                                    </span>
                                  </div>
                                </div>
                              </PhishButton>
                            ))}
                          </div>
                        </div>
                      )}
                    </div>
                  )}
                </div>
              </div>
              <div className="hidden sm:flex flex-col items-center justify-center px-6 border-l border-white/10 h-12">
                <span className="text-[10px] font-bold text-[#8B949E] uppercase tracking-widest">
                  Threat Score
                </span>
                <span
                  className={`text-3xl font-black leading-none mt-1 ${theme.text}`}
                >
                  {riskScore}
                </span>
              </div>
            </div>
            <div className="flex items-center gap-2 w-full lg:w-auto mt-4 lg:mt-0 flex-wrap">
              <PhishButton
                onClick={generatePDF}
                disabled={!limits.canExportPDF && !isSuperAdmin}
                title={
                  !limits.canExportPDF && !isSuperAdmin
                    ? "Upgrade to SOC Pro to export reports"
                    : "Export PDF Report"
                }
                className="rounded-full flex items-center justify-center px-[30px] py-[14px] border border-[rgba(48,54,61,0.9)] bg-[#2DD4BF]/12 text-[#2DD4BF] font-bold text-xs hover:bg-[#2DD4BF]/22 transition-all shadow-sm disabled:opacity-50 disabled:cursor-not-allowed"
              >
                <FileDown className="w-4 h-4 mr-1.5" />
                Report
              </PhishButton>
              <PhishButton
                onClick={() => setTakedownOpen(true)}
                disabled={!scan}
                className="rounded-full flex items-center justify-center px-[30px] py-[14px] border border-[rgba(48,54,61,0.9)] bg-indigo-500/12 text-indigo-300 font-bold text-xs hover:bg-indigo-500/22 transition-all shadow-sm disabled:opacity-50"
              >
                <Gavel className="w-4 h-4 mr-1.5" />
                Takedown
              </PhishButton>
              <PhishButton
                onClick={handleWhitelist}
                disabled={isPendingAction || isWhitelisted}
                className="rounded-full flex items-center justify-center px-[30px] py-[14px] border border-[rgba(48,54,61,0.9)] bg-[rgba(23,28,35,0.92)] text-[#E6EDF3] font-bold text-xs hover:bg-[rgba(30,35,42,0.95)] transition-all shadow-sm disabled:opacity-50 disabled:cursor-not-allowed"
              >
                <CheckCircle2
                  className={`w-4 h-4 mr-1.5 ${isWhitelisted ? "text-[#3FB950]" : ""}`}
                />
                {isWhitelisted ? "Whitelisted" : "Whitelist"}
              </PhishButton>
              <PhishButton
                onClick={handleTakeAction}
                disabled={isPendingAction}
                className="rounded-full flex items-center justify-center px-[30px] py-[14px] border border-[#F85149]/40 bg-[#F85149] hover:bg-[#f26d66] text-white font-black text-xs transition-all shadow-lg disabled:opacity-50"
              >
                {isPendingAction ? (
                  <Loader2 className="w-4 h-4 mr-1.5 animate-spin" />
                ) : (
                  <Ban className="w-4 h-4 mr-1.5 font-bold" />
                )}
                TAKE ACTION
              </PhishButton>
            </div>
          </div>
        </motion.section>
      </div>

      {/* Main Grid Content */}
      <main data-stagger-container className="flex-1 px-4 sm:px-6 py-8 w-full max-w-7xl mx-auto flex flex-col gap-6">
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 items-stretch">
          {/* Scan Summary Panel */}
          <div className="lg:col-span-1 flex flex-col">
            <div className="liquid-glass bg-white/5 shadow-[inset_0_1px_1px_rgba(255,255,255,0.05)] rounded-xl border border-white/10 flex flex-col h-full overflow-hidden">
              <div className="p-4 border-b border-white/10 flex justify-between items-center bg-white/5">
                <h3 className="font-bold text-sm text-white flex items-center gap-2 uppercase tracking-wide">
                  <Activity className="w-5 h-5 text-[#2DD4BF]" />
                  Scan Summary
                </h3>
                <span
                  className={`text-[10px] font-mono font-bold text-white px-2 py-0.5 rounded ${theme.bg}`}
                >
                  {verdictLabel.toUpperCase()}
                </span>
              </div>
              <div className="flex-1 overflow-y-auto max-h-[700px] scrollbar-thin scrollbar-thumb-slate-700">
                <div className="flex flex-col divide-y divide-slate-800">
                  <div
                    className={`p-4 ${theme.bgLight} border-l-[6px] ${theme.border}`}
                  >
                    <div className="flex justify-between items-start mb-1.5">
                      <div className="flex items-center gap-2">
                        <span
                          className={`text-[10px] font-black text-white px-1.5 py-0.5 rounded ${theme.bg}`}
                        >
                          ENGINES
                        </span>
                        {riskScore >= 40 && (
                          <AlertTriangle
                            className={`w-4 h-4 animate-pulse ${theme.text}`}
                          />
                        )}
                      </div>
                      <span className="text-[10px] text-[#8B949E] font-mono font-medium">
                        {malicious}/{totalEngines}
                      </span>
                    </div>
                    <div
                      className={`font-mono text-xs font-bold truncate mb-1.5 ${theme.text}`}
                    >
                      {malicious} malicious detection
                      {malicious !== 1 ? "s" : ""}
                    </div>
                    <div className="w-full bg-white/10 rounded-full h-2 mt-2">
                      <div
                        className={`${theme.bg} h-2 rounded-full transition-all`}
                        style={{
                          width:
                            totalEngines > 0
                              ? `${(malicious / totalEngines) * 100}%`
                              : "0%",
                        }}
                      />
                    </div>
                  </div>
                  <div
                    className={`p-4 border-l-[6px] ${riskScore >= 40 ? theme.border : "border-white/10"}`}
                  >
                    <div className="flex justify-between items-start mb-1.5">
                      <span
                        className={`text-[10px] font-black text-white px-1.5 py-0.5 rounded ${riskScore >= 40 ? theme.bg : "bg-slate-600"}`}
                      >
                        CATEGORY
                      </span>
                    </div>
                    <div
                      className={`font-mono text-xs font-bold truncate mb-1 ${riskScore >= 40 ? theme.text : "text-white"}`}
                    >
                      {threatTag}
                    </div>
                    <p className="text-[11px] text-[#8B949E] italic">
                      Risk score: {riskScore}/100
                    </p>
                  </div>
                  <div className="p-4 hover:bg-white/10 border-l-[6px] border-[#2DD4BF] transition-colors">
                    <div className="flex items-center gap-2 mb-2">
                      <span className="text-[10px] font-bold text-[#2DD4BF] bg-[#2DD4BF]/10 border border-[#2DD4BF]/20 px-1.5 py-0.5 rounded">
                        AI ANALYSIS
                      </span>
                    </div>
                    <p className="text-xs text-white leading-relaxed whitespace-pre-wrap">
                      {scan.ai_summary || "No AI analysis available."}
                    </p>
                  </div>
                  <div className="p-4 hover:bg-white/10 border-l-[6px] border-transparent transition-colors">
                    <div className="flex justify-between items-start mb-1">
                      <span className="text-[10px] font-bold text-[#2DD4BF] bg-[#2DD4BF]/10 border border-[#2DD4BF]/20 px-1.5 py-0.5 rounded">
                        SCANNED
                      </span>
                    </div>
                    <div className="font-mono text-xs text-white truncate mt-1">
                      {scanDate}
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>

          {/* Sandbox & Deep Scan Panel */}
          <div className="lg:col-span-2 flex flex-col gap-6">
            <div className="liquid-glass bg-white/5 shadow-[inset_0_1px_1px_rgba(255,255,255,0.05)] rounded-xl border border-white/10 flex flex-col overflow-hidden h-full">
              {/* Tab Header */}
              <div className="flex items-center bg-white/5 border-b border-white/10 px-4 pt-2.5 overflow-x-auto">
                <div className="flex gap-1">
                  {TABS.map((tab) => (
                    <PhishButton
                      key={tab.key}
                      onClick={() => setActiveTab(tab.key)}
                      className={`px-4 py-2.5 text-[11px] font-black tracking-wide whitespace-nowrap transition-colors ${
                        activeTab === tab.key
                          ? "bg-white/5 border-t border-x border-white/10 rounded-t-lg text-[#2DD4BF] border-b-2 border-b-[#0f1629] z-10"
                          : "text-[#8B949E] hover:text-white"
                      }`}
                    >
                      {tab.label}
                    </PhishButton>
                  ))}
                </div>
                <div className="flex-1"></div>
                <div className="flex items-center gap-3 pr-2">
                  <span className="text-[10px] font-bold text-[#8B949E] uppercase">
                    Live Sandbox
                  </span>
                  <div className="flex gap-1.5">
                    <span className="w-2.5 h-2.5 rounded-full bg-[#F85149]"></span>
                    <span className="w-2.5 h-2.5 rounded-full bg-yellow-400"></span>
                    <span className="w-2.5 h-2.5 rounded-full bg-[#3FB950]"></span>
                  </div>
                </div>
              </div>
              {renderTabContent()}
            </div>

            {/* Risk Flag Summary Strip */}
            {allRiskFlags.length > 0 && (
              <div className="bg-white/5 rounded-2xl border border-[#E3B341]/30 shadow-sm p-4">
                <div className="flex items-center gap-2 mb-3">
                  <AlertTriangle className="w-4 h-4 text-[#E3B341]" />
                  <span className="text-[10px] font-black text-[#E3B341] uppercase tracking-widest">
                    Risk Flag Summary ({allRiskFlags.length})
                  </span>
                </div>
                <div className="flex flex-wrap gap-2">
                  {allRiskFlags.map((flag: string, i: number) => (
                    <span
                      key={i}
                      className="text-[10px] font-bold text-[#E3B341] bg-[#E3B341]/10 border border-[#E3B341]/20 px-2.5 py-1 rounded-full"
                    >
                      {flag}
                    </span>
                  ))}
                </div>
              </div>
            )}

            {/* Deep scan error display */}
            {deepScanError && (
              <div className="bg-[#F85149]/10 rounded-2xl border border-[#F85149]/20 p-4 flex items-center gap-2">
                <AlertTriangle className="w-4 h-4 text-[#F85149]" />
                <span className="text-xs text-[#F85149]">
                  Deep scan error: {deepScanError}
                </span>
              </div>
            )}

            {/* Quick Intel Stats */}
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-6">
              <div className="liquid-glass bg-white/5 p-4 rounded-xl border border-white/10 shadow-[inset_0_1px_1px_rgba(255,255,255,0.05)] flex flex-col gap-1">
                <span className="text-[10px] font-black text-[#8B949E] uppercase tracking-widest">
                  Engine Detection
                </span>
                <span className="font-bold text-white">
                  {malicious} / {totalEngines} engines
                </span>
                <span className="text-[11px] text-[#8B949E]">
                  {totalEngines > 0
                    ? `${((malicious / totalEngines) * 100).toFixed(1)}% flagged`
                    : "No engine data"}
                </span>
              </div>
              <div className="liquid-glass bg-white/5 p-4 rounded-xl border border-white/10 shadow-[inset_0_1px_1px_rgba(255,255,255,0.05)] flex flex-col gap-1">
                <span className="text-[10px] font-black text-[#8B949E] uppercase tracking-widest">
                  Verdict
                </span>
                <div
                  className={`flex items-center gap-1.5 font-bold ${verdictColor}`}
                >
                  {verdictLabel.toLowerCase() === "malicious" ? (
                    <AlertTriangle className="w-4 h-4" />
                  ) : (
                    <CheckCircle2 className="w-4 h-4" />
                  )}
                  <span>{verdictLabel}</span>
                </div>
                <span className="text-[11px] text-[#8B949E]">
                  Risk: {riskScore}/100
                </span>
              </div>
              <div className="liquid-glass bg-white/5 p-4 rounded-xl border border-white/10 shadow-[inset_0_1px_1px_rgba(255,255,255,0.05)] flex flex-col gap-1">
                <span className="text-[10px] font-black text-[#8B949E] uppercase tracking-widest">
                  Category
                </span>
                <div className="flex items-center gap-2">
                  <div className="w-5 h-5 bg-white/10 rounded flex items-center justify-center text-[10px] text-[#2DD4BF] font-bold">
                    <ShieldAlert className="w-3 h-3" />
                  </div>
                  <span className="font-bold text-white">{threatTag}</span>
                </div>
                <span className="text-[11px] text-[#F85149] font-bold">
                  {riskScore >= 70 ? "Action recommended" : "Monitor"}
                </span>
              </div>
            </div>
          </div>
        </div>
      </main>
      <style
        dangerouslySetInnerHTML={{
          __html: `@keyframes scan { 0% { top: 0; opacity: 0; } 10% { opacity: 1; } 90% { opacity: 1; } 100% { top: 100%; opacity: 0; } }`,
        }}
      />
      {/* Takedown Modal */}
      {scan && (
        <TakedownModal
          isOpen={takedownOpen}
          onClose={() => setTakedownOpen(false)}
          target={scan.target}
          registrarAbuseEmail={
            (deepScanData?.whois as any)?.abuse_email ||
            (deepScanData?.whois as any)?.registrar_abuse_email ||
            null
          }
          resolvedIp={(deepScanData?.dns as any)?.a_records?.[0] || null}
          riskScore={riskScore}
          aiScore={
            heuristicStore.getResult(scan.target)?.heuristicScore ?? null
          }
          hasSSL={!!(deepScanData?.ssl as any)?.valid}
          threatCategory={threatTag}
          openPorts={[]}
          manipulationTactics={
            heuristicStore.getResult(scan.target)?.manipulationTactics || []
          }
        />
      )}
    </div>
  );
}
