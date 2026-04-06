"use client";

import { motion } from "framer-motion";

type Props = {
  timeToContain: string;
  activeIncidents: number;
  resolvedIncidents: number;
  formattedRiskScore: string;
};

const hoverProps = {
  whileHover: {
    scale: 1.02,
    boxShadow: "0 8px 32px rgba(45, 212, 191, 0.15)",
  },
  transition: { type: "spring" as const, stiffness: 300, damping: 20 },
};

export default function KpiCards({
  timeToContain,
  activeIncidents,
  resolvedIncidents,
  formattedRiskScore,
}: Props) {
  return (
    <div className="grid grid-cols-1 gap-6 sm:grid-cols-2 lg:grid-cols-4">
      <motion.div
        {...hoverProps}
        className="flex flex-col gap-2 rounded-[12px] border border-[rgba(48,54,61,0.9)] [background:rgba(255,255,255,0.05)] p-6 backdrop-blur-[8px]"
      >
        <div className="flex items-start justify-between">
          <span className="font-medium text-white/70">Time to Contain</span>
        </div>
        <div className="mt-2 text-3xl font-bold text-white">
          {timeToContain}
        </div>
      </motion.div>

      <motion.div
        {...hoverProps}
        className="flex flex-col gap-2 rounded-[12px] border border-[rgba(48,54,61,0.9)] [background:rgba(255,255,255,0.05)] p-6 backdrop-blur-[8px]"
      >
        <div className="flex items-start justify-between">
          <span className="font-medium text-white/70">Active Incidents</span>
          <span className="rounded-full border border-red-500/20 bg-red-500/10 px-2 py-0.5 text-xs font-bold text-red-500">
            {resolvedIncidents > 0 ? `-${resolvedIncidents}` : "+0"}
          </span>
        </div>
        <div className="mt-2 text-3xl font-bold text-white">
          {activeIncidents}
        </div>
      </motion.div>

      <motion.div
        {...hoverProps}
        className="flex flex-col gap-2 rounded-[12px] border border-[rgba(48,54,61,0.9)] [background:rgba(255,255,255,0.05)] p-6 backdrop-blur-[8px]"
      >
        <div className="flex items-start justify-between">
          <span className="font-medium text-white/70">API Latency</span>
        </div>
        <div className="mt-2 text-3xl font-bold text-white">14ms</div>
      </motion.div>

      <motion.div
        {...hoverProps}
        className="flex flex-col gap-2 rounded-[12px] border border-[rgba(48,54,61,0.9)] [background:rgba(255,255,255,0.05)] p-6 backdrop-blur-[8px]"
      >
        <div className="flex items-start justify-between">
          <span className="font-medium text-white/70">Global Risk Score</span>
        </div>
        <div className="mt-2 text-3xl font-bold text-[#2DD4BF]">
          {formattedRiskScore}
        </div>
      </motion.div>
    </div>
  );
}

