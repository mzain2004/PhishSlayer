"use client";

import { useState, useEffect, useRef } from "react";
import { motion, useInView } from "framer-motion";
import { PlayCircle, ShieldAlert } from "lucide-react";

export function ProductDemo() {
  const containerRef = useRef(null);
  const isInView = useInView(containerRef, { once: true, margin: "-100px" });
  
  const [typedText, setTypedText] = useState("");
  const targetText = "https://malicious-phishing-example.xyz";
  const [score, setScore] = useState(0);
  const [showResults, setShowResults] = useState(false);
  const [aiSummary, setAiSummary] = useState("");
  const targetAiSummary = "The DOM tree contains obfuscated JavaScript designed to harvest credentials. SSL certificate was registered 2 hours ago. Cross-referencing VirusTotal confirms malicious hosting IP.";

  useEffect(() => {
    if (!isInView) return;

    // Type out URL
    let textIdx = 0;
    const typingInterval = setInterval(() => {
      textIdx++;
      setTypedText(targetText.slice(0, textIdx));
      if (textIdx >= targetText.length) {
        clearInterval(typingInterval);
        setTimeout(() => setShowResults(true), 600);
      }
    }, 50);

    return () => clearInterval(typingInterval);
  }, [isInView]);

  useEffect(() => {
    if (!showResults) return;

    // Count up score
    let startScore = 0;
    const endScore = 94;
    const dur = 1000;
    const startObj = performance.now();
    
    const countupFn = (now: number) => {
      const p = Math.min((now - startObj) / dur, 1);
      setScore(Math.floor(p * endScore));
      if (p < 1) requestAnimationFrame(countupFn);
    };
    requestAnimationFrame(countupFn);

    // Type out AI summary
    let summaryIdx = 0;
    const summaryInterval = setInterval(() => {
      summaryIdx++;
      setAiSummary(targetAiSummary.slice(0, summaryIdx));
      if (summaryIdx >= targetAiSummary.length) clearInterval(summaryInterval);
    }, 30);

    return () => clearInterval(summaryInterval);
  }, [showResults]);

  return (
    <section className="bg-[#050505] py-32 border-b border-white/10" ref={containerRef}>
      <div className="max-w-5xl mx-auto px-6">
        <motion.div 
          initial={{ opacity: 0, y: 40 }} 
          whileInView={{ opacity: 1, y: 0 }} 
          transition={{ type: "spring", stiffness: 100, damping: 20 }}
          className="text-center mb-16"
        >
          <h2 className="text-3xl md:text-5xl font-black text-white tracking-tight">
            See It In Action
          </h2>
        </motion.div>

        {/* Demo Interface */}
        <motion.div 
          initial={{ opacity: 0, y: 60 }} 
          whileInView={{ opacity: 1, y: 0 }} 
          transition={{ type: "spring", stiffness: 100, damping: 20 }}
          className="relative group rounded-2xl bg-white/5 backdrop-blur-3xl border border-white/10 overflow-hidden shadow-[inset_0_1px_0_rgba(217,70,239,0.5),0_0_40px_rgba(139,92,246,0.1)]"
        >
          {/* Top Bar simulating browser window */}
          <div className="h-10 bg-white/5 border-b border-white/10 flex items-center px-4 gap-2">
            <div className="w-3 h-3 rounded-full bg-[#F85149]" />
            <div className="w-3 h-3 rounded-full bg-[#E3B341]" />
            <div className="w-3 h-3 rounded-full bg-[#3FB950]" />
          </div>

          <div className="p-6 md:p-10 grid md:grid-cols-2 gap-8 min-h-[400px]">
            {/* Left: Input */}
            <div className="flex flex-col justify-center">
              <div className="text-xs font-bold text-[#8B949E] uppercase tracking-wider mb-2">Target URL</div>
              <div className="w-full bg-[#0D1117] border border-[#30363D] rounded-[8px] p-4 text-[#E6EDF3] font-mono text-sm h-14 flex items-center shadow-inner">
                {typedText}
                {!showResults && <span className="w-2 h-5 bg-[#2DD4BF] animate-pulse ml-1" />}
              </div>
              <div className="mt-6 flex justify-end">
                <button 
                  className={`px-6 py-2.5 rounded-[8px] font-bold text-sm transition-all ${
                    showResults 
                      ? "bg-[#30363D] text-[#8B949E] cursor-not-allowed" 
                      : "bg-[#2DD4BF] text-[#0D1117] shadow-[0_0_15px_rgba(45,212,191,0.2)]"
                  }`}
                  disabled
                >
                  {showResults ? "Scan Processing" : "Analyze Target"}
                </button>
              </div>
            </div>

            {/* Right: Results Panel */}
            <div className="border border-[#30363D] rounded-[8px] bg-[#0D1117] p-6 relative">
              {!showResults ? (
                <div className="absolute inset-0 flex items-center justify-center text-[#8B949E] font-mono text-sm opacity-50">
                  Waiting for input...
                </div>
              ) : (
                <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="h-full flex flex-col">
                  <div className="flex justify-between items-start mb-6">
                    <div className="flex items-center gap-2 bg-[#F85149]/10 text-[#F85149] px-3 py-1 rounded-sm border border-[#F85149]/30">
                      <ShieldAlert className="w-5 h-5" />
                      <span className="font-bold text-sm">MALICIOUS</span>
                    </div>
                    <div className="text-right">
                      <div className="text-[10px] text-[#8B949E] font-bold uppercase tracking-widest mb-1">Risk Score</div>
                      <div className="text-4xl font-black text-[#F85149] font-mono">{score}</div>
                    </div>
                  </div>
                  <div className="flex-1">
                    <div className="text-[10px] text-[#8B949E] font-bold uppercase tracking-widest mb-2 border-b border-[#30363D] pb-1">Gemini AI Analysis</div>
                    <p className="text-[#E6EDF3] text-sm leading-relaxed font-mono">
                      {aiSummary}
                      {aiSummary.length < targetAiSummary.length && <span className="inline-block w-2 h-4 bg-[#2DD4BF] animate-pulse ml-1 align-middle" />}
                    </p>
                  </div>
                </motion.div>
              )}
            </div>
          </div>

          {/* Visual Tabs */}
          <div className="border-t border-[#30363D] bg-[#0D1117] px-6 py-3 flex gap-6 overflow-x-auto whitespace-nowrap hide-scrollbar">
            {["AI Heuristics", "Rendered View", "DOM Tree", "WHOIS", "SSL Profile"].map((tab, i) => (
              <div key={i} className={`text-xs font-bold uppercase tracking-wider pb-3 border-b-2 cursor-pointer ${i === 0 ? "text-[#2DD4BF] border-[#2DD4BF]" : "text-[#8B949E] border-transparent hover:text-[#E6EDF3]"}`}>
                {tab}
              </div>
            ))}
          </div>

          {/* Play Overlay */}
          <div className="absolute inset-0 bg-black/60 backdrop-blur-sm opacity-0 group-hover:opacity-100 transition-opacity duration-300 flex items-center justify-center cursor-pointer">
            <div className="flex flex-col items-center gap-3">
              <PlayCircle className="w-16 h-16 text-[#D946EF] bg-transparent rounded-full shadow-[0_0_20px_#D946EF]" />
              <span className="text-white font-bold tracking-wide">Watch the 60s Demo</span>
            </div>
          </div>
        </motion.div>
      </div>
    </section>
  );
}
