'use client';

import { useState } from 'react';

import { useAgentWebSocket } from '@/lib/hooks/useAgentWebSocket';
import { Terminal, Shield, Activity, PowerOff, ShieldAlert, Monitor, Key, Plus } from 'lucide-react';
import { toast } from 'sonner';

export default function AgentDashboard() {
  const { agents, isConnected, sendCommand, mitigationLogs } = useAgentWebSocket();
  const [modalType, setModalType] = useState<'kill_process' | 'block_ip' | null>(null);
  const [targetAgentId, setTargetAgentId] = useState<string | null>(null);
  const [inputValue, setInputValue] = useState('');

  const submitCommand = () => {
    if (!targetAgentId || !modalType || !inputValue) return;
    const cmdPayload = modalType === 'kill_process' 
      ? { command: 'kill_process', payload: { pid: parseInt(inputValue, 10) } }
      : { command: 'block_ip', payload: { ip: inputValue } };
    
    sendCommand(targetAgentId, cmdPayload);
    toast.success(`Command dispatched to ${targetAgentId}`);
    setModalType(null);
  };

  const handleCommand = async (agentId: string, cmd: string) => {
    try {
      const res = await fetch('/api/agent/commands', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ agentId, command: cmd }),
      });
      const data = await res.json();
      if (res.ok) {
        toast.success(`Command '${cmd}' sent to ${agentId}`);
      } else {
        toast.error(`Failed: ${data.error}`);
      }
    } catch (err) {
      toast.error('Error sending command');
    }
  };

  return (
    <div className="space-y-8">
      {/* Header Stat Row */}
      <div className="flex flex-wrap items-center gap-4">
        <div className={`flex items-center gap-2 px-3 py-1 rounded-full border text-xs font-bold uppercase tracking-wider transition-colors ${isConnected ? 'bg-teal-500/10 text-teal-400 border-teal-500/20' : 'bg-red-500/10 text-red-500 border-red-500/20'}`}>
          {isConnected ? <Activity className="w-3 h-3" /> : <PowerOff className="w-3 h-3" />}
          {isConnected ? 'Controller Online' : 'Controller Offline'}
        </div>
        <div className="text-[#8b949e] text-xs font-semibold uppercase tracking-widest">
          {agents.length} Agent{agents.length !== 1 ? 's' : ''} Online
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {agents.map((agent) => (
          <div key={agent.agentId} className="bg-[#161b22] border border-[#30363d] rounded-xl hover:bg-[#1c2128] transition-all duration-200 overflow-hidden group">
            <div className="p-5">
              <div className="flex justify-between items-start mb-4">
                <div className="flex items-start gap-3">
                  <div className="w-10 h-10 rounded-lg bg-[#0d1117] border border-[#30363d] flex items-center justify-center text-teal-400 group-hover:border-teal-500/30 transition-colors">
                    <Terminal className="w-5 h-5" />
                  </div>
                  <div>
                    <h4 className="text-[#e6edf3] text-sm font-semibold truncate max-w-[140px]">{agent.hostname}</h4>
                    <p className="text-[#6e7681] text-[10px] font-mono mt-0.5">ID: {agent.agentId.slice(0, 12)}...</p>
                  </div>
                </div>
                <span className={`px-2 py-0.5 rounded-md text-[10px] font-bold uppercase ${agent.status === 'online' ? 'bg-[#3fb950]/10 text-[#3fb950] border border-[#3fb950]/20' : 'bg-[#6e7681]/10 text-[#6e7681] border border-[#6e7681]/20'}`}>
                  {agent.status}
                </span>
              </div>

              <div className="grid grid-cols-2 gap-4 py-4 border-t border-[#30363d]/50">
                <div>
                  <p className="text-[#6e7681] text-[10px] uppercase font-bold tracking-wider">Platform</p>
                  <p className="text-[#e6edf3] text-xs font-medium capitalize mt-1">
                    {agent.platform === 'win32' ? 'Windows' : agent.platform === 'darwin' ? 'macOS' : 'Linux'}
                  </p>
                </div>
                <div>
                  <p className="text-[#6e7681] text-[10px] uppercase font-bold tracking-wider">Signals</p>
                  <p className="text-[#e6edf3] text-xs font-medium mt-1 flex items-center gap-1.5">
                    <ShieldAlert className={`w-3.5 h-3.5 ${agent.threatCount > 0 ? 'text-[#f85149]' : 'text-[#3fb950]'}`} />
                    {agent.threatCount} Detected
                  </p>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-2 mt-2">
                <button 
                  onClick={() => { setModalType('kill_process'); setTargetAgentId(agent.agentId); }} 
                  disabled={agent.status === 'offline'}
                  title={agent.status === 'offline' ? "Agent offline — cannot send commands" : ""}
                  className="py-1.5 bg-[#1c2128] hover:bg-[#21262d] border border-[#30363d] text-[#e6edf3] text-xs font-semibold rounded-lg transition-colors disabled:opacity-50 disabled:cursor-not-allowed">
                  Kill Process
                </button>
                <button 
                  onClick={() => { setModalType('block_ip'); setTargetAgentId(agent.agentId); }}
                  disabled={agent.status === 'offline'}
                  title={agent.status === 'offline' ? "Agent offline — cannot send commands" : ""}
                  className="py-1.5 bg-teal-500/10 hover:bg-teal-500/20 border border-teal-500/20 text-teal-400 text-xs font-semibold rounded-lg transition-colors disabled:opacity-50 disabled:cursor-not-allowed">
                  Block IP
                </button>
              </div>
            </div>
          </div>
        ))}

        {agents.length === 0 && (
          <div className="col-span-full border border-[#30363d] border-dashed rounded-2xl p-12 flex flex-col items-center justify-center text-center">
            <div className="w-16 h-16 bg-[#161b22] border border-[#30363d] rounded-2xl flex items-center justify-center mb-6">
              <Monitor className="w-8 h-8 text-[#8b949e]" />
            </div>
            <h3 className="text-[#e6edf3] text-lg font-semibold mb-2">Deploy Your First Agent</h3>
            <p className="text-[#8b949e] text-sm max-w-sm mb-10 leading-relaxed">
              Phish-Slayer works best with active endpoints. Deploy our lightweight agent for real-time protection.
            </p>

            <div className="w-full max-w-3xl grid grid-cols-1 md:grid-cols-2 gap-6 mb-10">
              {/* macOS / Linux */}
              <div className="bg-[#161b22] border border-[#30363d] rounded-xl p-5 text-left">
                <div className="flex items-center gap-2 mb-4">
                  <div className="w-6 h-6 rounded bg-[#0d1117] border border-[#30363d] flex items-center justify-center">
                    <Terminal className="w-3.5 h-3.5 text-teal-400" />
                  </div>
                  <span className="text-[#e6edf3] text-xs font-bold uppercase tracking-widest">Linux / macOS</span>
                </div>
                <div className="bg-[#0d1117] rounded-lg p-3 font-mono text-[11px] text-teal-400 overflow-x-auto whitespace-nowrap border border-[#30363d]">
                  curl -sSL https://phishslayer.tech/install | bash
                </div>
              </div>

              {/* Windows */}
              <div className="bg-[#161b22] border border-[#30363d] rounded-xl p-5 text-left">
                <div className="flex items-center gap-2 mb-4">
                  <div className="w-6 h-6 rounded bg-[#0d1117] border border-[#30363d] flex items-center justify-center">
                    <Terminal className="w-3.5 h-3.5 text-indigo-400" />
                  </div>
                  <span className="text-[#e6edf3] text-xs font-bold uppercase tracking-widest">Windows (PS)</span>
                </div>
                <div className="bg-[#0d1117] rounded-lg p-3 font-mono text-[11px] text-indigo-400 overflow-x-auto whitespace-nowrap border border-[#30363d]">
                  iwr https://phishslayer.tech/install.ps1 | iex
                </div>
              </div>
            </div>

            <div className="bg-amber-500/5 border border-amber-500/20 rounded-xl p-5 w-full max-w-3xl flex items-start gap-4 text-left">
              <div className="w-10 h-10 rounded-lg bg-amber-500/10 flex items-center justify-center flex-shrink-0">
                <Key className="w-5 h-5 text-amber-500" />
              </div>
              <div className="space-y-1">
                <p className="text-amber-500 text-sm font-bold tracking-tight">Agent Integration Secret</p>
                <p className="text-[#8b949e] text-xs">Set this as <span className="text-[#e6edf3] font-mono">AGENT_SECRET</span> on your target machine during installation.</p>
                <div className="bg-black/40 rounded px-2.5 py-1.5 mt-3 select-all">
                  <code className="text-amber-300 text-xs font-mono">PhSlyr_Agent_2026!xK9#mZ</code>
                </div>
              </div>
            </div>
          </div>
        )}
      </div>

      {/* Mitigation Log */}
      <div className="mt-8 bg-[#161b22] border border-[#30363d] rounded-xl overflow-hidden">
        <div className="px-6 py-4 border-b border-[#30363d] flex items-center gap-2">
          <Terminal className="w-4 h-4 text-teal-400" />
          <h3 className="text-[#e6edf3] font-semibold text-sm">Mitigation Log</h3>
        </div>
        <div className="divide-y divide-[#30363d]">
          {mitigationLogs && mitigationLogs.length > 0 ? (
            mitigationLogs.map((log, idx) => (
              <div key={idx} className="px-6 py-3 flex items-center justify-between hover:bg-[#1c2128] transition-colors">
                <div className="flex items-center gap-4">
                  <span className={`px-2 py-0.5 rounded text-[10px] font-bold uppercase ${log.success ? 'bg-teal-500/10 text-teal-400' : 'bg-red-500/10 text-red-500'}`}>
                    {log.success ? 'SUCCESS' : 'FAILED'}
                  </span>
                  <div className="text-sm">
                    <span className="text-[#e6edf3] font-medium">{log.action === 'kill_process' ? 'Killed PID' : 'Blocked IP'} </span>
                    <span className="text-[#8b949e] font-mono">{log.pid || log.ip}</span>
                  </div>
                </div>
                <div className="text-xs text-[#6e7681] font-mono">
                  {new Date(log.timestamp).toLocaleTimeString()}
                </div>
              </div>
            ))
          ) : (
            <div className="px-6 py-8 text-center text-[#6e7681] text-sm">
              No recent mitigation actions.
            </div>
          )}
        </div>
      </div>

      {/* Command Modal */}
      {modalType && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm">
          <div className="bg-[#161b22] border border-[#30363d] rounded-xl p-6 w-full max-w-sm shadow-2xl relative">
            <h3 className="text-[#e6edf3] text-lg font-semibold mb-2">
              {modalType === 'kill_process' ? 'Kill Process' : 'Block IP Address'}
            </h3>
            <p className="text-[#8b949e] text-xs mb-4">
              {modalType === 'kill_process' ? 'Enter the exact PID to terminate.' : 'Enter the exact IPv4 address to drop.'}
            </p>
            <input
              type={modalType === 'kill_process' ? 'number' : 'text'}
              autoFocus
              placeholder={modalType === 'kill_process' ? 'e.g. 5124' : 'e.g. 192.168.1.100'}
              value={inputValue}
              onChange={(e) => setInputValue(e.target.value)}
              className="w-full bg-[#0d1117] border border-[#30363d] text-[#e6edf3] rounded-md px-3 py-2 text-sm focus:outline-none focus:border-teal-500 mb-6"
            />
            <div className="flex gap-3 justify-end">
              <button 
                onClick={() => setModalType(null)}
                className="px-4 py-2 rounded-md text-[#8b949e] hover:text-[#e6edf3] hover:bg-[#1c2128] text-sm font-medium transition-colors">
                Cancel
              </button>
              <button 
                onClick={submitCommand}
                disabled={!inputValue}
                className="px-4 py-2 rounded-md bg-teal-500 text-black hover:bg-teal-400 disabled:opacity-50 text-sm font-semibold transition-colors">
                Execute
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
