"use client";

import { motion } from "framer-motion";
import DashboardCard from "@/components/dashboard/DashboardCard";
import StatusBadge from "@/components/dashboard/StatusBadge";

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
      <motion.div {...hoverProps} className="h-full">
        <DashboardCard className="flex h-full flex-col gap-2">
          <div className="flex items-start justify-between">
            <span className="dashboard-card-label">Time to Contain</span>
          </div>
          <div className="dashboard-metric-value mt-2 text-white">
            {timeToContain}
          </div>
        </DashboardCard>
      </motion.div>

      <motion.div {...hoverProps} className="h-full">
        <DashboardCard className="flex h-full flex-col gap-2">
          <div className="flex items-start justify-between">
            <span className="dashboard-card-label">Active Incidents</span>
            <StatusBadge
              status={resolvedIncidents > 0 ? "warning" : "healthy"}
              label={resolvedIncidents > 0 ? `-${resolvedIncidents}` : "+0"}
            />
          </div>
          <div className="dashboard-metric-value mt-2 text-white">
            {activeIncidents}
          </div>
        </DashboardCard>
      </motion.div>

      <motion.div {...hoverProps} className="h-full">
        <DashboardCard className="flex h-full flex-col gap-2">
          <div className="flex items-start justify-between">
            <span className="dashboard-card-label">API Latency</span>
          </div>
          <div className="dashboard-metric-value mt-2 text-white">14ms</div>
        </DashboardCard>
      </motion.div>

      <motion.div {...hoverProps} className="h-full">
        <DashboardCard className="flex h-full flex-col gap-2">
          <div className="flex items-start justify-between">
            <span className="dashboard-card-label">Global Risk Score</span>
          </div>
          <div className="dashboard-metric-value mt-2 text-[#2DD4BF]">
            {formattedRiskScore}
          </div>
        </DashboardCard>
      </motion.div>
    </div>
  );
}
