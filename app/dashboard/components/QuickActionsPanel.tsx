"use client";

import { motion } from "framer-motion";

export default function QuickActionsPanel() {
  return (
    <div className="p-6 bg-white/5 backdrop-blur-3xl border border-white/10 shadow-[inset_0_1px_1px_rgba(255,255,255,0.1)] rounded-2xl flex flex-col gap-4">
      <h2 className="text-xl font-bold text-white mb-2">Quick Actions</h2>
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        <motion.button
          whileHover={{
            scale: 1.03,
            boxShadow: "0 0 20px rgba(45,212,191,0.4)",
          }}
          whileTap={{ scale: 0.96 }}
          className="flex flex-col items-center justify-center gap-3 rounded-full px-5 py-2 [transition:all_0.2s_ease] [background:linear-gradient(135deg,#2DD4BF,#22c55e)] text-center text-sm font-semibold text-black"
        >
          Run System Diagnostic
        </motion.button>
        <motion.button
          whileHover={{
            scale: 1.03,
            boxShadow: "0 0 20px rgba(45,212,191,0.4)",
          }}
          whileTap={{ scale: 0.96 }}
          className="flex flex-col items-center justify-center gap-3 rounded-full px-5 py-2 [transition:all_0.2s_ease] [background:linear-gradient(135deg,#2DD4BF,#22c55e)] text-center text-sm font-semibold text-black"
        >
          Isolate Compromised Nodes
        </motion.button>
      </div>
    </div>
  );
}
