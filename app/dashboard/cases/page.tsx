"use client";

import { useState, useEffect } from "react";
import { 
  ShieldAlert, 
  Activity, 
  Clock, 
  Search, 
  Filter, 
  ChevronRight, 
  AlertCircle,
  Loader2,
  RefreshCw
} from "lucide-react";

interface Case {
  id: string;
  title: string;
  severity: "p1" | "p2" | "p3" | "p4";
  status: "open" | "investigating" | "contained" | "closed";
  alert_type: string;
  source_ip: string;
  created_at: string;
  sla_deadline: string;
}

export default function CasesDashboard() {
  const [cases, setCases] = useState<Case[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchCases = async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await fetch("/api/cases");
      if (!res.ok) throw new Error("Failed to fetch cases");
      const data = await res.json();
      setCases(data);
    } catch (err) {
      setError(err instanceof Error ? err.message : "An unexpected error occurred");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchCases();
  }, []);

  const getSeverityStyles = (severity: string) => {
    switch (severity.toLowerCase()) {
      case "p1":
        return { bg: "bg-[#ff4d4f]/10", text: "text-[#ff4d4f]", border: "border-[#ff4d4f]/30", label: "Critical" };
      case "p2":
        return { bg: "bg-[#f5a623]/10", text: "text-[#f5a623]", border: "border-[#f5a623]/30", label: "High" };
      case "p3":
        return { bg: "bg-yellow-400/10", text: "text-yellow-400", border: "border-yellow-400/30", label: "Medium" };
      case "p4":
        return { bg: "bg-gray-400/10", text: "text-gray-400", border: "border-gray-400/30", label: "Low" };
      default:
        return { bg: "bg-gray-500/10", text: "text-gray-500", border: "border-gray-500/30", label: severity };
    }
  };

  const getStatusColor = (status: string) => {
    switch (status.toLowerCase()) {
      case "open": return "text-white";
      case "investigating": return "text-accent";
      case "contained": return "text-primary";
      case "closed": return "text-[#8B949E]";
      default: return "text-white";
    }
  };

  if (loading) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[60vh] gap-4">
        <Loader2 className="w-8 h-8 animate-spin text-primary" />
        <p className="text-[#8B949E] text-sm font-medium animate-pulse">Synchronizing case vault...</p>
      </div>
    );
  }

  if (error) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[60vh] text-center p-6">
        <div className="w-16 h-16 rounded-full bg-danger/10 flex items-center justify-center mb-4">
          <AlertCircle className="w-8 h-8 text-danger" />
        </div>
        <h2 className="text-xl font-black text-white mb-2 uppercase">Sync Failure</h2>
        <p className="text-[#8B949E] text-sm max-w-md mb-6">{error}</p>
        <button 
          onClick={fetchCases}
          className="px-6 py-2.5 bg-white/5 border border-white/10 rounded-full text-white text-xs font-black hover:bg-white/10 transition-all flex items-center gap-2"
        >
          <RefreshCw className="w-4 h-4" /> REATTEMPT
        </button>
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-6 animate-in fade-in duration-500">
      {/* Filters & Actions */}
      <div className="flex flex-col md:flex-row gap-4 items-center justify-between glass p-4">
        <div className="relative w-full md:w-96">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-[#8B949E]" />
          <input 
            type="text" 
            placeholder="SEARCH CASES, IPS, OR ALERTS..."
            className="w-full bg-black/40 border border-white/10 rounded-lg py-2 pl-10 pr-4 text-xs font-mono text-white focus:border-primary/50 outline-none transition-all placeholder:text-[#8B949E]"
          />
        </div>
        <div className="flex items-center gap-2 w-full md:w-auto">
          <button className="flex-1 md:flex-none px-4 py-2 bg-white/5 border border-white/10 rounded-lg text-white text-[10px] font-black uppercase tracking-widest hover:bg-white/10 transition-all flex items-center justify-center gap-2">
            <Filter className="w-3 h-3" /> Filter
          </button>
          <button className="flex-1 md:flex-none px-4 py-2 bg-primary border border-primary/20 rounded-lg text-white text-[10px] font-black uppercase tracking-widest hover:bg-primary/90 transition-all shadow-lg shadow-primary/20">
            + New Case
          </button>
        </div>
      </div>

      {/* Cases List */}
      <div className="glass overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="border-b border-white/10 bg-white/5">
                <th className="px-6 py-4 text-[10px] font-black text-[#8B949E] uppercase tracking-widest">Case Details</th>
                <th className="px-6 py-4 text-[10px] font-black text-[#8B949E] uppercase tracking-widest">Severity</th>
                <th className="px-6 py-4 text-[10px] font-black text-[#8B949E] uppercase tracking-widest">Status</th>
                <th className="px-6 py-4 text-[10px] font-black text-[#8B949E] uppercase tracking-widest">Telemetry</th>
                <th className="px-6 py-4 text-[10px] font-black text-[#8B949E] uppercase tracking-widest">SLA Deadline</th>
                <th className="px-6 py-4"></th>
              </tr>
            </thead>
            <tbody className="divide-y divide-white/10">
              {cases.length === 0 ? (
                <tr>
                  <td colSpan={6} className="px-6 py-12 text-center">
                    <div className="flex flex-col items-center gap-2 opacity-40">
                      <ShieldAlert className="w-12 h-12 text-white mb-2" />
                      <p className="text-white text-sm font-black uppercase tracking-widest">Vault Empty</p>
                      <p className="text-[#8B949E] text-xs">No active cases detected in this sector.</p>
                    </div>
                  </td>
                </tr>
              ) : (
                cases.map((item) => {
                  const sev = getSeverityStyles(item.severity);
                  return (
                    <tr key={item.id} className="hover:bg-white/[0.02] transition-colors group cursor-pointer">
                      <td className="px-6 py-5">
                        <div className="flex flex-col gap-1">
                          <span className="text-sm font-bold text-white group-hover:text-primary transition-colors">{item.title}</span>
                          <span className="text-[10px] text-[#8B949E] font-mono uppercase tracking-tighter">ID: {item.id.slice(0, 8)}...</span>
                        </div>
                      </td>
                      <td className="px-6 py-5">
                        <span className={`px-2.5 py-1 rounded text-[10px] font-black uppercase tracking-wider border ${sev.bg} ${sev.text} ${sev.border}`}>
                          {sev.label}
                        </span>
                      </td>
                      <td className="px-6 py-5">
                        <div className="flex items-center gap-2">
                          <div className={`w-1.5 h-1.5 rounded-full ${getStatusColor(item.status).replace('text-', 'bg-')}`}></div>
                          <span className={`text-[11px] font-black uppercase tracking-widest ${getStatusColor(item.status)}`}>
                            {item.status}
                          </span>
                        </div>
                      </td>
                      <td className="px-6 py-5">
                        <div className="flex flex-col gap-1.5">
                          <div className="flex items-center gap-2">
                            <Activity className="w-3 h-3 text-accent" />
                            <span className="text-[11px] text-white font-medium">{item.alert_type}</span>
                          </div>
                          <div className="flex items-center gap-2">
                            <span className="text-[10px] text-[#8B949E] font-mono">{item.source_ip || 'N/A'}</span>
                          </div>
                        </div>
                      </td>
                      <td className="px-6 py-5">
                        <div className="flex flex-col gap-1">
                          <div className="flex items-center gap-1.5 text-danger">
                            <Clock className="w-3 h-3" />
                            <span className="text-[11px] font-mono font-bold">
                              {item.sla_deadline ? new Date(item.sla_deadline).toLocaleString() : 'N/A'}
                            </span>
                          </div>
                          <span className="text-[10px] text-[#8B949E] font-mono">
                            Opened: {new Date(item.created_at).toLocaleDateString()}
                          </span>
                        </div>
                      </td>
                      <td className="px-6 py-5 text-right">
                        <button className="p-2 hover:bg-white/10 rounded-full transition-all text-[#8B949E] hover:text-white">
                          <ChevronRight className="w-5 h-5" />
                        </button>
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Stats Summary */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
        <div className="glass p-5 flex flex-col gap-2">
          <span className="text-[10px] font-black text-[#8B949E] uppercase tracking-[0.2em]">Total Active</span>
          <span className="text-3xl font-black text-white">{cases.length}</span>
          <div className="w-full bg-white/5 h-1 rounded-full mt-2">
            <div className="bg-primary w-full h-full rounded-full shadow-[0_0_8px_rgba(124,106,247,0.5)]"></div>
          </div>
        </div>
        <div className="glass p-5 flex flex-col gap-2">
          <span className="text-[10px] font-black text-[#8B949E] uppercase tracking-[0.2em]">P1 Critical</span>
          <span className="text-3xl font-black text-[#ff4d4f]">
            {cases.filter(c => c.severity === 'p1').length}
          </span>
          <div className="w-full bg-white/5 h-1 rounded-full mt-2">
            <div className="bg-[#ff4d4f] h-full rounded-full" style={{ width: `${(cases.filter(c => c.severity === 'p1').length / (cases.length || 1)) * 100}%` }}></div>
          </div>
        </div>
        <div className="glass p-5 flex flex-col gap-2">
          <span className="text-[10px] font-black text-[#8B949E] uppercase tracking-[0.2em]">MTTR (AVG)</span>
          <span className="text-3xl font-black text-accent">2.4h</span>
          <div className="w-full bg-white/5 h-1 rounded-full mt-2">
            <div className="bg-accent w-[70%] h-full rounded-full"></div>
          </div>
        </div>
        <div className="glass p-5 flex flex-col gap-2">
          <span className="text-[10px] font-black text-[#8B949E] uppercase tracking-[0.2em]">SLA Compliance</span>
          <span className="text-3xl font-black text-white">98.2%</span>
          <div className="w-full bg-white/5 h-1 rounded-full mt-2">
            <div className="bg-white w-[98%] h-full rounded-full"></div>
          </div>
        </div>
      </div>

      <style jsx global>{`
        .glass {
          background: rgba(255, 255, 255, 0.03);
          backdrop-filter: blur(12px);
          border: 1px solid rgba(255, 255, 255, 0.08);
          border-radius: 1rem;
        }
        @import url('https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700;800;900&family=JetBrains+Mono:wght@400;500;700&display=swap');
        
        :root {
          --font-inter: 'Inter', sans-serif;
          --font-mono: 'JetBrains Mono', monospace;
        }

        body {
          font-family: var(--font-inter);
        }

        .font-mono {
          font-family: var(--font-mono);
        }
      `}</style>
    </div>
  );
}
