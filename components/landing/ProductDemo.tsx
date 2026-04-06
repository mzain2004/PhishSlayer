"use client";

import { motion } from "framer-motion";
import { PlayCircle, ShieldCheck, TerminalSquare, Monitor } from "lucide-react";
import { useState, useEffect, useRef } from "react";

export function ProductDemo() {
  const [activeTab, setActiveTab] = useState(0);
  const [logs, setLogs] = useState<string[]>([]);
  const [showResults, setShowResults] = useState(false);
  const containerRef = useRef<HTMLElement>(null);

  const tabs = [
    { title: "Dashboard", icon: <Monitor className="w-4 h-4" strokeWidth={1.5} /> },
    { title: "Terminal View", icon: <TerminalSquare className="w-4 h-4" strokeWidth={1.5} /> },
    { title: "Auto-Remediation", icon: <ShieldCheck className="w-4 h-4" strokeWidth={1.5} /> }
  ];

  useEffect(() => {
    if (activeTab === 1) {
      setLogs([]);
      setShowResults(false);
      let count = 0;
      const msgs = [
        "Initializing Phish-Slayer Engine v3.0.4...",
        "Connecting to fleet WebSocket [WSS]...",
        "Receiving endpoint telemetry from 450 nodes.",
        "ANALYZING: Suspicious powershell execution detected on DESKTOP-499X.",
        "CORRELATING: Executable hash matched to TA505 toolkit.",
        "ACTION: Initiating network isolation via EDR agent.",
        "ISOLATION COMPLETE. Node quarantined.",
        "Generating incident report and slack notification..."
      ];
      const interval = setInterval(() => {
        if (count < msgs.length) {
          setLogs(prev => [...prev, msgs[count]]);
          count++;
        } else {
          clearInterval(interval);
          setTimeout(() => setShowResults(true), 500);
        }
      }, 800);
      return () => clearInterval(interval);
    }
  }, [activeTab]);

  const springConfig = { type: "spring" as const, bounce: 0.2, duration: 0.8 };

  return (
    <section className="bg-[#050507] py-32 border-b border-white/5 antialiased" ref={containerRef}>
      <div className="max-w-5xl mx-auto px-6">
        <motion.div 
          initial={{ opacity: 0, y: 30 }} 
          whileInView={{ opacity: 1, y: 0 }} 
          viewport={{ once: true, amount: 0.2 }}
          transition={springConfig}
          className="text-center mb-16"
        >
          <h2 className="text-3xl md:text-5xl font-black text-white tracking-tight antialiased">
            See It In Action
          </h2>
        </motion.div>

        {/* Demo Interface */}
        <motion.div 
          initial={{ opacity: 0, y: 30 }} 
          whileInView={{ opacity: 1, y: 0 }} 
          viewport={{ once: true, amount: 0.2 }}
          transition={springConfig}
          className="relative group rounded-2xl bg-black/40 backdrop-blur-2xl border border-white/5 overflow-hidden"
        >
          {/* Top Bar */}
          <div className="h-10 bg-black/60 border-b border-white/5 flex items-center px-4 gap-2">
            <div className="w-3 h-3 rounded-full bg-red-500/70" />
            <div className="w-3 h-3 rounded-full bg-amber-400/70" />
            <div className="w-3 h-3 rounded-full bg-green-500/70" />
            
            <div className="flex ml-6 h-full font-mono text-xs">
              {tabs.map((tab, i) => (
                <button
                  key={i}
                  onClick={() => setActiveTab(i)}
                  className={`flex items-center gap-2 px-4 h-full border-r border-white/5 transition-colors duration-200 ${
                    activeTab === i 
                      ? "text-teal-400 border-t-2 border-t-teal-400 bg-white/[0.02]" 
                      : "text-[#8B949E] hover:text-slate-300 hover:bg-white/[0.02]"
                  }`}
                >
                  {tab.icon} {tab.title}
                </button>
              ))}
            </div>
          </div>

          {/* Content Area */}
          <div className="aspect-video bg-[#050507] relative w-full h-full overflow-hidden flex items-center justify-center p-8">
            {activeTab === 0 ? (
              <div className="w-full h-full text-[#8B949E] flex items-center justify-center font-mono relative">
                <div className="text-center">
                  <Monitor className="w-16 h-16 mx-auto mb-4 opacity-40" strokeWidth={1.5} />
                  <p className="antialiased">Dashboard visualization module loading...</p>
                  <p className="text-xs mt-2 opacity-40 antialiased">Video asset pending deployment</p>
                </div>
              </div>
            ) : activeTab === 1 ? (
              <div className="w-full h-full bg-[#050507] text-green-400 font-mono text-sm leading-relaxed text-left flex flex-col justify-end pb-4 border border-white/5 rounded-lg p-4">
                <div className="space-y-2">
                  {logs.map((log, i) => (
                    <div key={i}>
                      <span className="text-slate-600 mr-2">{">"}</span> {log}
                    </div>
                  ))}
                  {showResults && (
                    <div className="mt-4 pt-4 border-t border-white/5 text-white font-black">
                      STATUS CODE: 200 SECURE | INCIDENT RESOLVED
                    </div>
                  )}
                  {!showResults && logs.length > 0 && (
                    <div className="animate-pulse h-4 mt-2">
                      <span className="text-slate-600 mr-2">{">"}</span> _
                    </div>
                  )}
                </div>
              </div>
            ) : (
              <div className="w-full h-full flex flex-col items-center justify-center text-[#8B949E] font-mono">
                <ShieldCheck className="w-16 h-16 mx-auto mb-4 text-teal-400/70" strokeWidth={1.5} />
                <p className="antialiased">Auto-Remediation rules engine online.</p>
                <div className="mt-6 flex gap-2">
                  <div className="h-2 w-16 bg-red-500/50 rounded" />
                  <div className="h-2 w-16 bg-green-500/50 rounded" />
                  <div className="h-2 w-16 bg-amber-400/50 rounded" />
                </div>
              </div>
            )}
          </div>

          {/* Play Overlay */}
          <div className="absolute inset-0 bg-black/60 backdrop-blur-sm opacity-0 group-hover:opacity-100 transition-opacity duration-300 flex items-center justify-center cursor-pointer">
            <div className="flex flex-col items-center gap-3">
              <PlayCircle className="w-16 h-16 text-teal-400" strokeWidth={1.5} />
              <span className="text-white font-bold tracking-wide antialiased">Watch the 60s Demo</span>
            </div>
          </div>
        </motion.div>
      </div>
    </section>
  );
}

