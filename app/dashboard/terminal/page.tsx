"use client";

import { useState } from "react";
import { motion } from "framer-motion";
import { Terminal, Send, Loader2 } from "lucide-react";

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
    <div className="w-full max-w-6xl mx-auto px-6 py-8 text-white">
      <div className="mb-6">
        <h1 className="text-3xl font-bold tracking-tight flex items-center gap-3">
          <Terminal className="w-7 h-7 text-[#2DD4BF]" />
          AI Terminal
        </h1>
        <p className="text-[#8B949E] mt-2 text-sm">
          Run command-style prompts for rapid SOC triage workflows.
        </p>
      </div>

      <motion.div
        whileHover={{ scale: 1.005, boxShadow: "0 8px 32px rgba(45,212,191,0.15)" }}
        transition={{ type: "spring", stiffness: 300, damping: 20 }}
        className="rounded-2xl border border-white/10 bg-white/5 backdrop-blur-sm overflow-hidden"
      >
        <div className="border-b border-white/10 px-4 py-3 text-xs uppercase tracking-widest text-[#8B949E]">
          Session Output
        </div>

        <div className="h-[360px] overflow-y-auto px-4 py-4 space-y-3 bg-[rgba(15,23,42,0.45)]">
          {entries.map((entry, idx) => (
            <div
              key={`${entry.role}-${idx}`}
              className={`rounded-lg px-3 py-2 text-sm ${entry.role === "user" ? "bg-white/10 text-[#E6EDF3]" : "bg-[#2DD4BF]/10 text-[#2DD4BF]"}`}
            >
              {entry.role === "user" ? "> " : "< "}
              {entry.text}
            </div>
          ))}
        </div>

        <div className="border-t border-white/10 p-3 flex items-center gap-2">
          <input
            value={input}
            onChange={(e) => setInput(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === "Enter") submit();
            }}
            placeholder="Type command or prompt..."
            className="flex-1 rounded-full bg-[rgba(255,255,255,0.08)] border border-[rgba(255,255,255,0.15)] px-4 py-2 text-sm text-[#E6EDF3] focus:outline-none focus:border-[#2DD4BF]"
          />
          <motion.button
            onClick={submit}
            disabled={running || !input.trim()}
            whileHover={{ scale: 1.03, boxShadow: "0 0 24px rgba(45,212,191,0.35)" }}
            whileTap={{ scale: 0.97 }}
            className="rounded-full px-4 py-2 font-semibold text-black [background:linear-gradient(135deg,#2DD4BF,#22c55e)] disabled:opacity-50 flex items-center gap-2"
          >
            {running ? <Loader2 className="w-4 h-4 animate-spin" /> : <Send className="w-4 h-4" />}
            Run
          </motion.button>
        </div>
      </motion.div>
    </div>
  );
}
