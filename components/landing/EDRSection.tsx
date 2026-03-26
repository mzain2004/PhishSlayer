"use client";

import { useEffect, useState, useRef } from "react";
import { motion, useInView } from "framer-motion";
import { CheckCircle2, ArrowRight } from "lucide-react";
import Link from "next/link";

const springConfig = { type: "spring" as const, stiffness: 60, damping: 25, bounce: 0.1 };

const TERMINAL_LINES = [
  { text: "[AGENT-01] process_event: chrome.exe → 142.250.x.x:443", color: "#2DD4BF" },
  { text: "[AGENT-02] connection: suspicious port 4444 detected", color: "#F85149" },
  { text: "[AGENT-01] file_mod: C:\\Windows\\System32\\drivers\\etc\\hosts", color: "#2DD4BF" },
  { text: "[AGENT-02] action: BLOCKED outbound connection", color: "#F85149" },
  { text: "[AGENT-03] heartbeat: online | latency 12ms", color: "#2DD4BF" },
];

export function EDRSection() {
  const containerRef = useRef<HTMLDivElement>(null);
  const isInView = useInView(containerRef, { once: false, margin: "-80px" });
  const [visibleLines, setVisibleLines] = useState<number>(0);
  const [typedChars, setTypedChars] = useState<string[]>(TERMINAL_LINES.map(() => ""));

  useEffect(() => {
    if (!isInView) {
      setVisibleLines(0);
      setTypedChars(TERMINAL_LINES.map(() => ""));
      return;
    }

    let currentLine = 0;
    let currentChar = 0;
    let timeoutId: NodeJS.Timeout;

    const typeNextChar = () => {
      if (currentLine >= TERMINAL_LINES.length) return;

      const fullText = TERMINAL_LINES[currentLine].text;
      if (currentChar < fullText.length) {
        setTypedChars(prev => {
          const next = [...prev];
          next[currentLine] = fullText.slice(0, currentChar + 1);
          return next;
        });
        currentChar++;
        timeoutId = setTimeout(typeNextChar, 20);
      } else {
        setVisibleLines(prev => prev + 1);
        currentLine++;
        currentChar = 0;
        timeoutId = setTimeout(typeNextChar, 500);
      }
    };

    timeoutId = setTimeout(typeNextChar, 500);
    return () => clearTimeout(timeoutId);
  }, [isInView]);

  return (
    <section className="bg-[#0A0E13] py-24 border-b border-[#1C2128] overflow-hidden">
      <div className="max-w-7xl mx-auto px-6 grid lg:grid-cols-2 gap-16 items-center">
        <motion.div
          initial={{ opacity: 0, y: 80 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: false, margin: "-80px" }}
          transition={springConfig}
        >
          <span className="font-mono text-[11px] tracking-[0.15em] text-[#2DD4BF] uppercase block mb-4">Endpoint Detection</span>
          <h2 className="text-3xl md:text-5xl font-bold text-[#E6EDF3] tracking-[-0.01em] mb-8 leading-[1.1]">
            Deploy an EDR Agent. See Everything. In Real Time.
          </h2>
          
          <ul className="space-y-4 mb-10">
            {[
              "Stream live process telemetry over WebSocket",
              "Monitor outbound network connections",
              "File system change detection",
              "Remote kill and block from fleet dashboard",
              "Windows and Linux support"
            ].map((feature, i) => (
              <motion.li 
                key={i} 
                initial={{ opacity: 0, y: 10 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: false }}
                transition={{ delay: 0.2 + i * 0.1 }}
                className="flex items-start gap-3 text-[#8B949E] text-[16px] leading-[1.7]"
              >
                <CheckCircle2 className="w-6 h-6 text-[#2DD4BF] shrink-0 mt-0.5" strokeWidth={1.5} />
                {feature}
              </motion.li>
            ))}
          </ul>

          <Link
            href="/auth/signup"
            className="inline-flex justify-center items-center gap-2 bg-[#2DD4BF] hover:bg-[#14B8A6] text-[#0D1117] font-bold text-[15px] px-8 py-3 rounded-full transition-all hover:-translate-y-1 hover:shadow-lg"
          >
            Deploy Your First Agent Free <ArrowRight className="w-4 h-4" strokeWidth={1.5} />
          </Link>
        </motion.div>

        <motion.div
          ref={containerRef}
          initial={{ opacity: 0, y: 80 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: false, margin: "-80px" }}
          transition={{ ...springConfig, delay: 0.2 }}
          className="relative"
        >
          <div className="bg-[#161B22] border border-[#30363D] rounded-[8px] shadow-2xl overflow-hidden relative z-10">
            <div className="h-10 bg-[#0D1117] border-b border-[#30363D] flex items-center px-4 gap-2">
              <div className="w-3 h-3 rounded-full bg-[#30363D]" />
              <div className="w-3 h-3 rounded-full bg-[#30363D]" />
              <div className="w-3 h-3 rounded-full bg-[#30363D]" />
              <div className="ml-4 font-mono text-[10px] text-[#8B949E] tracking-widest uppercase">Fleet Monitor</div>
            </div>
            
            <div className="p-6 h-[320px] font-mono text-sm bg-[#0D1117] overflow-y-auto">
              {TERMINAL_LINES.map((line, i) => (
                <div 
                  key={i} 
                  style={{ 
                    marginBottom: '12px',
                    color: line.color,
                    animation: 'fadeInLine 0.3s ease-out forwards',
                    display: typedChars[i] ? 'block' : 'none'
                  }}
                >
                  <span className="text-[#8B949E] opacity-50">
                    {(new Date()).toISOString().split('T')[1].slice(0, 8)} |
                  </span> {typedChars[i]}
                  {i === visibleLines && (
                    <span className="ml-1 w-2 h-4 bg-[#2DD4BF] inline-block align-middle animate-[blink_1s_infinite]" />
                  )}
                </div>
              ))}
            </div>
          </div>
        </motion.div>
      </div>
    </section>
  );
}
