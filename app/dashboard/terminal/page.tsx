"use client";

import { useState } from "react";
import { motion } from "framer-motion";
import { Terminal, Send, Loader2 } from "lucide-react";
import PhishButton from "@/components/ui/PhishButton";
import UpgradePrompt from "@/components/UpgradePrompt";
import DashboardCard from "@/components/dashboard/DashboardCard";

type Entry = { role: "user" | "assistant"; text: string };

export default function TerminalPage() {
  const [input, setInput] = useState("");
  const [running, setRunning] = useState(false);
  const [entries, setEntries] = useState<Entry[]>([
    {
      role: "assistant",
      text: "AI Terminal online. Enter a command prompt to triage indicators.",
    },
  ]);

  const submit = () => {
    const value = input.trim();
    if (!value || running) return;

    setEntries((prev) => [...prev, { role: "user", text: value }]);
    setInput("");
    setRunning(true);

    setTimeout(() => {
      setEntries((prev) => [
        ...prev,
        {
          role: "assistant",
          text: `Queued analysis for: ${value}`,
        },
      ]);
      setRunning(false);
    }, 350);
  };

  return (
    <div className="w-full max-w-6xl mx-auto text-white">
      <UpgradePrompt requiredTier="pro" feature="AI terminal workflows" />
      <div className="mb-6">
        <h1 className="dashboard-page-title tracking-tight flex items-center gap-3">
          <Terminal className="w-7 h-7 text-accent" />
          AI Terminal
        </h1>
        <p className="text-[#8B949E] mt-2 text-sm">
          Run command-style prompts for rapid SOC triage workflows.
        </p>
      </div>

      <motion.div
        whileHover={{
          scale: 1.005,
          boxShadow: "0 8px 32px rgba(124,106,247,0.2)",
        }}
        transition={{ type: "spring", stiffness: 300, damping: 20 }}
        className="h-full"
      >
        <DashboardCard className="overflow-hidden p-0">
          <div className="border-b border-white/10 px-4 py-3 text-xs uppercase tracking-widest text-[#8B949E]">
            Session Output
          </div>

          <div className="h-[360px] space-y-3 overflow-y-auto glass px-4 py-4">
            {entries.map((entry, idx) => (
              <div
                key={`${entry.role}-${idx}`}
                className={`rounded-lg px-3 py-2 text-sm ${entry.role === "user" ? "bg-white/10 text-[#E6EDF3]" : "bg-accent/10 text-accent"}`}
              >
                {entry.role === "user" ? "> " : "< "}
                {entry.text}
              </div>
            ))}
          </div>

          <div className="flex items-center gap-2 border-t border-white/10 p-3 glass">
            <input
              value={input}
              onChange={(e) => setInput(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === "Enter") submit();
              }}
              placeholder="Type command or prompt..."
              className="flex-1 rounded-full border border-[rgba(255,255,255,0.15)] bg-[rgba(255,255,255,0.08)] px-4 py-2 text-sm text-[#E6EDF3] focus:border-primary focus:outline-none focus:ring-2 focus:ring-primary/30"
            />
            <PhishButton
              onClick={submit}
              disabled={running || !input.trim()}
              whileHover={{
                scale: 1.03,
                boxShadow: "0 0 24px rgba(124,106,247,0.35)",
              }}
              whileTap={{ scale: 0.97 }}
              className="flex items-center gap-2 rounded-full px-4 py-2 font-semibold text-white bg-gradient-to-r from-primary to-accent disabled:opacity-50"
            >
              {running ? (
                <Loader2 className="w-4 h-4 animate-spin" />
              ) : (
                <Send className="w-4 h-4" />
              )}
              Run
            </PhishButton>
          </div>
        </DashboardCard>
      </motion.div>
    </div>
  );
}
