"use client";

import { useState } from "react";

interface ToolCall {
  id?: string;
  tool: string;
  duration_ms?: number;
  status: "running" | "done" | "error";
  input?: unknown;
  output?: unknown;
}

interface Props {
  toolCalls: ToolCall[];
  streaming?: boolean;
}

export function AgentTrace({ toolCalls, streaming = false }: Props) {
  const [open, setOpen] = useState<string | null>(null);
  const [rawOpen, setRawOpen] = useState<string | null>(null);

  return (
    <div className="space-y-1">
      {toolCalls.map((call, i) => {
        const key = call.id ?? `${call.tool}-${i}`;
        const isOpen = open === key;
        const isRaw = rawOpen === key;
        const inputStr = JSON.stringify(call.input ?? {});
        const outputStr = JSON.stringify(call.output ?? {});

        return (
          <div key={key} className="rounded-lg border border-zinc-800 overflow-hidden">
            <button
              onClick={() => setOpen(isOpen ? null : key)}
              className="w-full flex items-center justify-between px-3 py-2 hover:bg-zinc-800/40 transition-colors text-left"
            >
              <div className="flex items-center gap-2 min-w-0">
                <span
                  className={`w-1.5 h-1.5 shrink-0 rounded-full ${
                    call.status === "done"
                      ? "bg-green-500"
                      : call.status === "error"
                      ? "bg-red-500"
                      : "bg-amber-400 animate-pulse"
                  }`}
                />
                <span className="text-xs font-mono text-zinc-300 truncate">{call.tool}</span>
              </div>
              <div className="flex items-center gap-2 shrink-0">
                {call.duration_ms != null && (
                  <span className="text-[10px] font-mono text-zinc-600 px-1.5 py-0.5 bg-zinc-800 rounded">
                    {call.duration_ms}ms
                  </span>
                )}
                {call.status === "error" && (
                  <span className="text-[10px] font-mono text-red-400 px-1.5 py-0.5 bg-red-500/10 rounded">
                    ERR
                  </span>
                )}
                <span className="text-zinc-600 text-xs">{isOpen ? "▼" : "▶"}</span>
              </div>
            </button>

            {isOpen && (
              <div className="px-3 pb-3 border-t border-zinc-800 space-y-3 pt-2">
                {call.input !== undefined && (
                  <div>
                    <p className="text-[10px] text-zinc-600 mb-1 uppercase tracking-wider">Input</p>
                    <p className="text-xs text-zinc-400 font-mono break-all">
                      {inputStr.length > 120 ? `${inputStr.substring(0, 120)}…` : inputStr}
                    </p>
                  </div>
                )}
                {call.output !== undefined && (
                  <div>
                    <p className="text-[10px] text-zinc-600 mb-1 uppercase tracking-wider">Result</p>
                    <p className="text-xs text-zinc-400 font-mono break-all">
                      {outputStr.length > 120 ? `${outputStr.substring(0, 120)}…` : outputStr}
                    </p>
                  </div>
                )}
                <div className="flex items-center gap-3">
                  <button
                    onClick={() => setRawOpen(isRaw ? null : key)}
                    className="text-[10px] text-indigo-400 hover:text-indigo-300 transition-colors"
                  >
                    {isRaw ? "Hide JSON" : "Raw JSON"}
                  </button>
                </div>
                {isRaw && (
                  <pre className="text-[10px] text-zinc-500 font-mono bg-zinc-900 rounded-lg p-3 overflow-x-auto max-h-48">
                    {JSON.stringify(call, null, 2)}
                  </pre>
                )}
              </div>
            )}
          </div>
        );
      })}

      {streaming && (
        <div className="px-3 py-2 text-xs text-zinc-500 font-mono flex items-center gap-1">
          <span className="text-indigo-400 animate-pulse text-base">▌</span>
          <span>Agent running…</span>
        </div>
      )}

      {!toolCalls.length && !streaming && (
        <p className="text-xs text-zinc-600 py-2 text-center">No tool calls recorded</p>
      )}
    </div>
  );
}
