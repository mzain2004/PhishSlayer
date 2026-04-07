"use client";

import Link from "next/link";
import { motion } from "framer-motion";
import {
  Activity,
  RefreshCw,
  Shield,
  AlertTriangle,
  Database,
  ArrowRight,
} from "lucide-react";

type RecentScan = {
  target: string;
  verdict: string;
  dateLabel: string;
  riskScore: number;
};

type CommandCenterViewProps = {
  totalScans: number;
  maliciousScans: number;
  activeIncidents: number;
  resolvedIncidents: number;
  intelVaultSize: number;
  recentScans: RecentScan[];
};

const glassCard =
  "liquid-glass bg-[rgba(23,28,35,0.85)] backdrop-blur-3xl border border-[rgba(48,54,61,0.9)] shadow-[inset_0_1px_1px_rgba(255,255,255,0.1)] rounded-2xl";

const staggerGrid = {
  hidden: { opacity: 0 },
  show: {
    opacity: 1,
    transition: {
      staggerChildren: 0.12,
    },
  },
};

const gridItem = {
  hidden: { opacity: 0, y: 20 },
  show: {
    opacity: 1,
    y: 0,
    transition: { duration: 0.5, ease: "easeOut" as const },
  },
};

export default function CommandCenterView({
  totalScans,
  maliciousScans,
  activeIncidents,
  resolvedIncidents,
  intelVaultSize,
  recentScans,
}: CommandCenterViewProps) {
  return (
    <div className="flex-1 flex flex-col bg-transparent min-h-full w-full text-white">
      <div className="px-8 py-6 border-b border-white/10">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-white text-2xl font-semibold tracking-tight">
              Command Center
            </h1>
            <p className="text-white/50 text-sm mt-0.5">
              Enterprise Security Posture - Liquid Glass
            </p>
          </div>
          <Link
            href="/dashboard/scans"
            className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-[#2DD4BF] text-black font-semibold hover:bg-[#14B8A6] transition-colors"
          >
            Launch Scan
            <ArrowRight className="w-4 h-4" />
          </Link>
        </div>
      </div>

      <div className="p-8 space-y-8 max-w-7xl mx-auto w-full">
        <motion.div
          initial="hidden"
          whileInView="show"
          viewport={{ once: true }}
          variants={staggerGrid}
          className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6"
        >
          <motion.div
            variants={gridItem}
            className={`p-6 ${glassCard} flex flex-col gap-2`}
          >
            <div className="flex justify-between items-start">
              <span className="text-white/70 font-medium">Total Scans</span>
            </div>
            <div className="text-3xl font-bold text-white mt-2">
              {totalScans}
            </div>
          </motion.div>

          <motion.div
            variants={gridItem}
            className={`p-6 ${glassCard} flex flex-col gap-2`}
          >
            <div className="flex justify-between items-start">
              <span className="text-white/70 font-medium">Malicious</span>
              <span className="px-2 py-0.5 rounded-full bg-red-500/10 text-red-500 text-xs font-bold border border-red-500/20">
                Active
              </span>
            </div>
            <div className="text-3xl font-bold text-red-400 mt-2">
              {maliciousScans}
            </div>
          </motion.div>

          <motion.div
            variants={gridItem}
            className={`p-6 ${glassCard} flex flex-col gap-2`}
          >
            <div className="flex justify-between items-start">
              <span className="text-white/70 font-medium">
                Active Incidents
              </span>
            </div>
            <div className="text-3xl font-bold text-amber-300 mt-2">
              {activeIncidents}
            </div>
            <span className="text-xs text-white/50">
              {resolvedIncidents} resolved
            </span>
          </motion.div>

          <motion.div
            variants={gridItem}
            className={`p-6 ${glassCard} flex flex-col gap-2`}
          >
            <div className="flex justify-between items-start">
              <span className="text-white/70 font-medium">Intel Vault</span>
            </div>
            <div className="text-3xl font-bold text-[#2DD4BF] mt-2">
              {intelVaultSize}
            </div>
          </motion.div>
        </motion.div>

        <motion.div
          className={`p-6 ${glassCard} flex flex-col gap-6`}
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
        >
          <div className="flex justify-between items-center">
            <h2 className="text-xl font-bold text-white">
              Network Telemetry (Live)
            </h2>
            <div className="flex items-center gap-2">
              <div className="w-2 h-2 rounded-full bg-green-500 animate-pulse"></div>
              <span className="text-xs text-white/50 uppercase tracking-wider">
                Live
              </span>
            </div>
          </div>

          <div className="w-full h-52 relative flex items-end justify-between gap-[2px] pt-6 overflow-hidden">
            <div className="absolute inset-0 flex flex-col justify-between pointer-events-none opacity-20">
              {[...Array(5)].map((_, i) => (
                <div
                  key={i}
                  className="w-full h-[1px] bg-white border-b border-white/5"
                ></div>
              ))}
            </div>
            <div className="flex-1 flex items-end justify-between gap-[2px] h-full z-10">
              {[...Array(72)].map((_, i) => {
                const height = 20 + (Math.sin(i * 0.2) * 40 + 40);
                const isAccent = i % 5 === 0;
                return (
                  <div
                    key={i}
                    className={`flex-1 rounded-t-sm transition-all duration-500 ${
                      isAccent
                        ? "bg-[#A78BFA]/60 shadow-[0_0_10px_rgba(167,139,250,0.3)]"
                        : "bg-[#2DD4BF]/40 shadow-[0_0_10px_rgba(45,212,191,0.2)]"
                    }`}
                    style={{ height: `${height}%` }}
                  ></div>
                );
              })}
            </div>
          </div>
        </motion.div>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          <motion.div
            className={`p-6 ${glassCard} flex flex-col gap-4`}
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
          >
            <h2 className="text-xl font-bold text-white mb-2">Quick Actions</h2>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <Link
                href="/dashboard/scans"
                className="p-4 rounded-xl bg-[rgba(23,28,35,0.85)] border border-[rgba(48,54,61,0.9)] flex flex-col items-center justify-center gap-3 text-center transition-colors hover:bg-white/10"
              >
                <Activity className="w-6 h-6 text-[#2DD4BF]" />
                <span className="text-sm font-bold text-white">
                  Run System Diagnostic
                </span>
              </Link>
              <Link
                href="/dashboard/incidents"
                className="p-4 rounded-xl bg-[rgba(23,28,35,0.85)] border border-[rgba(48,54,61,0.9)] flex flex-col items-center justify-center gap-3 text-center transition-colors hover:bg-white/10"
              >
                <Shield className="w-6 h-6 text-white" />
                <span className="text-sm font-bold text-white">
                  Isolate Compromised Nodes
                </span>
              </Link>
            </div>
          </motion.div>

          <motion.div
            className={`p-6 ${glassCard} flex flex-col gap-4`}
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
          >
            <div className="flex justify-between items-center mb-2">
              <h2 className="text-xl font-bold text-white">Event Feed</h2>
              <Link
                href="/dashboard/threats"
                className="text-xs text-[#2DD4BF] hover:underline"
              >
                View All
              </Link>
            </div>

            <motion.div
              initial="hidden"
              whileInView="show"
              viewport={{ once: true }}
              variants={staggerGrid}
              className="flex flex-col gap-3"
            >
              {(recentScans.length > 0
                ? recentScans.slice(0, 3)
                : [
                    {
                      target: "No recent scan activity",
                      verdict: "clean",
                      dateLabel: "Just now",
                      riskScore: 0,
                    },
                  ]
              ).map((scan, index) => {
                const isMalicious = scan.verdict.toLowerCase() === "malicious";
                return (
                  <motion.div
                    key={`${scan.target}-${index}`}
                    variants={gridItem}
                    className="p-3 rounded-lg bg-[rgba(23,28,35,0.85)] border border-[rgba(48,54,61,0.9)] flex items-start gap-3"
                  >
                    <div
                      className={`w-2 h-2 rounded-full mt-1.5 shrink-0 ${
                        isMalicious ? "bg-red-500" : "bg-[#2DD4BF]"
                      }`}
                    ></div>
                    <div className="flex flex-col">
                      <span className="text-sm text-white/90 font-medium">
                        {scan.target}
                      </span>
                      <span className="text-xs text-white/50">
                        {scan.dateLabel} - verdict: {scan.verdict.toUpperCase()}{" "}
                        - score: {scan.riskScore}
                      </span>
                    </div>
                  </motion.div>
                );
              })}
            </motion.div>
          </motion.div>
        </div>
      </div>
    </div>
  );
}

