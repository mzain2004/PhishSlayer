"use client";

import { useState } from "react";
import { motion } from "framer-motion";
import { FileText, Download, Loader2 } from "lucide-react";
import { toast } from "sonner";

export default function ReportsPage() {
  const [isExporting, setIsExporting] = useState(false);

  const exportExecutivePdf = async () => {
    setIsExporting(true);
    try {
      const { default: jsPDF } = await import("jspdf");
      const doc = new jsPDF("p", "mm", "a4");
      const width = doc.internal.pageSize.getWidth();

      doc.setFillColor(15, 23, 42);
      doc.rect(0, 0, width, 36, "F");
      doc.setFillColor(45, 212, 191);
      doc.rect(0, 36, width, 3, "F");

      doc.setTextColor(255, 255, 255);
      doc.setFont("helvetica", "bold");
      doc.setFontSize(20);
      doc.text("PHISH-SLAYER REPORTS", 14, 18);

      doc.setFont("helvetica", "normal");
      doc.setFontSize(10);
      doc.setTextColor(148, 163, 184);
      doc.text(`Generated: ${new Date().toLocaleString()}`, 14, 28);

      doc.setTextColor(15, 23, 42);
      doc.setFont("helvetica", "bold");
      doc.setFontSize(14);
      doc.text("Executive Summary", 14, 52);

      doc.setFont("helvetica", "normal");
      doc.setFontSize(11);
      const body =
        "This executive report is generated from Phish-Slayer telemetry and can be attached to compliance, board, and incident response workflows. Use the Threat Intelligence page for deep IOC-level reporting.";
      const lines = doc.splitTextToSize(body, width - 28);
      doc.text(lines, 14, 62);

      doc.save(`phish-slayer-report-${new Date().toISOString().slice(0, 10)}.pdf`);
      toast.success("PDF exported successfully");
    } catch (err) {
      toast.error("Failed to export PDF");
    } finally {
      setIsExporting(false);
    }
  };

  return (
    <div className="w-full max-w-6xl mx-auto px-6 py-8 text-white">
      <div className="mb-8">
        <h1 className="text-3xl font-bold tracking-tight flex items-center gap-3">
          <FileText className="w-7 h-7 text-[#2DD4BF]" />
          Reports
        </h1>
        <p className="text-[#8B949E] mt-2 text-sm">
          Generate and export executive-ready PDF summaries.
        </p>
      </div>

      <motion.div
        whileHover={{ scale: 1.01, boxShadow: "0 8px 32px rgba(45,212,191,0.15)" }}
        transition={{ type: "spring", stiffness: 300, damping: 20 }}
        className="rounded-2xl border border-white/10 bg-white/5 backdrop-blur-sm p-6"
      >
        <h2 className="text-lg font-semibold text-[#E6EDF3] mb-2">Executive PDF Export</h2>
        <p className="text-sm text-[#8B949E] mb-6">
          Export a clean summary report. For full deep-dive scan reports, use the Threat Intelligence module.
        </p>

        <motion.button
          onClick={exportExecutivePdf}
          disabled={isExporting}
          whileHover={{ scale: 1.03, boxShadow: "0 0 24px rgba(45,212,191,0.35)" }}
          whileTap={{ scale: 0.97 }}
          className="inline-flex items-center gap-2 rounded-full px-6 py-3 font-bold text-black [background:linear-gradient(135deg,#2DD4BF,#22c55e)] disabled:opacity-60"
        >
          {isExporting ? <Loader2 className="w-4 h-4 animate-spin" /> : <Download className="w-4 h-4" />}
          {isExporting ? "Generating..." : "Export PDF"}
        </motion.button>
      </motion.div>
    </div>
  );
}
