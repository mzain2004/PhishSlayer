"use client";

import { motion } from "framer-motion";
import { PlayCircle, ShieldCheck, TerminalSquare } from "lucide-react";
import { useState, useEffect, useRef } from "react";

export function ProductDemo() {
  const [activeTab, setActiveTab] = useState(0);
  const [isPlaying, setIsPlaying] = useState(false);
  const videoRef = useRef<HTMLVideoElement>(null);
  
  // Terminal animation simulation
  const [logs, setLogs] = useState<string[]>([]);
  const [showResults, setShowResults] = useState(false);
  const containerRef = useRef<HTMLElement>(null);

  const tabs = [
    { title: "Dashboard", icon: <Monitor className="w-4 h-4" /> },
    { title: "Terminal View", icon: <TerminalSquare className="w-4 h-4" /> },
    { title: "Auto-Remediation", icon: <ShieldCheck className="w-4 h-4" /> }
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

  return (
    <section className="bg-[#050505] py-32 border-b border-white/10" ref={containerRef}>
      <div className="max-w-5xl mx-auto px-6">
        <motion.div 
          initial={{ opacity: 0, y: 40 }} 
          whileInView={{ opacity: 1, y: 0 }} 
          viewport={{ once: true, margin: "-100px" }}
          transition={{ type: "spring", stiffness: 100, damping: 20 }}
          className="text-center mb-16"
        >
          <h2 className="text-3xl md:text-5xl font-black text-white tracking-tight">
            See It In Action
          </h2>
        </motion.div>

        {/* Demo Interface */}
        <motion.div 
          initial={{ opacity: 0, y: 40 }} 
          whileInView={{ opacity: 1, y: 0 }} 
          viewport={{ once: true, margin: "-100px" }}
          transition={{ type: "spring", stiffness: 100, damping: 20 }}
          className="relative group rounded-2xl bg-white/[0.02] backdrop-blur-xl border border-white/[0.08] overflow-hidden"
        >
          {/* Top Bar simulating browser window */}
          <div className="h-10 bg-white/5 border-b border-white/10 flex items-center px-4 gap-2">
            <div className="w-3 h-3 rounded-full bg-[#F85149]" />
            <div className="w-3 h-3 rounded-full bg-[#E3B341]" />
            <div className="w-3 h-3 rounded-full bg-[#3FB950]" />
            
            {/* Tabs */}
            <div className="flex ml-6 h-full font-mono text-xs">
              {tabs.map((tab, i) => (
                <button
                  key={i}
                  onClick={() => setActiveTab(i)}
                  className={`flex items-center gap-2 px-4 h-full border-r border-white/10 transition-colors ${
                    activeTab === i 
                      ? "bg-transparent text-[#8B5CF6] border-t-2 border-t-[#8B5CF6]" 
                      : "text-[#8B949E] hover:bg-white/5"
                  }`}
                >
                  {tab.icon} {tab.title}
                </button>
              ))}
            </div>
          </div>

          {/* Content Area */}
          <div className="aspect-video bg-[#050505] relative w-full h-full overflow-hidden flex items-center justify-center p-8">
            {activeTab === 0 ? (
              <div className="w-full h-full text-[#8B949E] flex items-center justify-center font-mono relative">
                {/* Fallback mock UI for Dashboard if no video */}
                <div className="absolute inset-0 bg-[url('https://www.transparenttextures.com/patterns/cubes.png')] opacity-5" />
                <div className="text-center">
                  <Monitor className="w-16 h-16 mx-auto mb-4 opacity-50" />
                  <p>Dashboard visualization module loading...</p>
                  <p className="text-xs mt-2 opacity-50">Video asset pending deployment</p>
                </div>
              </div>
            ) : activeTab === 1 ? (
              <div className="w-full h-full bg-[#050505] text-[#3FB950] font-mono text-sm leading-relaxed text-left flex flex-col justify-end pb-4 border border-white/5 rounded p-4">
                <div className="space-y-2">
                  {logs.map((log, i) => (
                    <div key={i} className="animate-in fade-in slide-in-from-bottom-2">
                      <span className="text-white/30 mr-2">{">"}</span> {log}
                    </div>
                  ))}
                  {showResults && (
                    <div className="mt-4 pt-4 border-t border-white/10 text-white font-black animate-in fade-in">
                      STATUS CODE: 200 SECURE | INCIDENT RESOLVED
                    </div>
                  )}
                  {!showResults && logs.length > 0 && (
                    <div className="animate-pulse h-4 mt-2">
                      <span className="text-white/30 mr-2">{">"}</span> _
                    </div>
                  )}
                </div>
              </div>
            ) : (
              <div className="w-full h-full flex flex-col items-center justify-center text-[#8B949E] font-mono">
                <ShieldCheck className="w-16 h-16 mx-auto mb-4 text-[#8B5CF6] opacity-70" />
                <p>Auto-Remediation rules engine online.</p>
                <div className="mt-6 flex gap-2">
                  <div className="h-2 w-16 bg-[#F85149] rounded" />
                  <div className="h-2 w-16 bg-[#3FB950] rounded" />
                  <div className="h-2 w-16 bg-[#E3B341] rounded" />
                </div>
              </div>
            )}
          </div>

          {/* Play Overlay */}
          <div className="absolute inset-0 bg-black/60 backdrop-blur-sm opacity-0 group-hover:opacity-100 transition-opacity duration-300 flex items-center justify-center cursor-pointer">
            <div className="flex flex-col items-center gap-3">
              <PlayCircle className="w-16 h-16 text-[#8B5CF6] bg-transparent rounded-full" />
              <span className="text-white font-bold tracking-wide">Watch the 60s Demo</span>
            </div>
          </div>
        </motion.div>
      </div>
    </section>
  );
}

// Minimal stub to prevent undefined icon
const Monitor = ({ className }: { className?: string }) => (
  <svg className={className} xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><rect width="20" height="14" x="2" y="3" rx="2"/><line x1="8" x2="16" y1="21" y2="21"/><line x1="12" x2="12" y1="17" y2="21"/></svg>
);
