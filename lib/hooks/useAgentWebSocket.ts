'use client';

import { useState, useEffect, useCallback, useRef } from 'react';

export interface AgentData {
  agentId: string;
  hostname: string;
  platform: string;
  status: 'online' | 'offline';
  lastSeen: string;
  threatCount: number;
}

export function useAgentWebSocket() {
  const [agents, setAgents] = useState<AgentData[]>([]);
  const [isConnected, setIsConnected] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const wsRef = useRef<WebSocket | null>(null);

  const connect = useCallback(() => {
    try {
      // Determine WebSocket protocol based on current connection
      const protocol = window.location.protocol === 'https:' ? 'wss:' : 'ws:';
      const wsUrl = `${protocol}//${window.location.host}/api/dashboard/ws`;
      
      const ws = new WebSocket(wsUrl);
      wsRef.current = ws;

      ws.onopen = () => {
        setIsConnected(true);
        setError(null);
      };

      ws.onmessage = (event) => {
        try {
          const data = JSON.parse(event.data);
          
          if (data.type === 'agent_list') {
            setAgents(data.agents || []);
          } else if (data.type === 'telemetry') {
            // Update specific agent threat count if needed, or rely on agent_list
          } else if (data.type === 'command_result') {
            // Optional: emit event or toast notification for command results
            console.log('Command result:', data);
          }
        } catch (err) {
          console.error('Failed to parse WebSocket message:', err);
        }
      };

      ws.onclose = () => {
        setIsConnected(false);
        wsRef.current = null;
        // Attempt to reconnect after 5 seconds
        setTimeout(connect, 5000);
      };

      ws.onerror = () => {
        setError('WebSocket connection error');
        ws.close();
      };
    } catch (err: any) {
      setError(err.message || 'Failed to establish WebSocket connection');
    }
  }, []);

  useEffect(() => {
    connect();
    return () => {
      if (wsRef.current) {
        wsRef.current.close();
      }
    };
  }, [connect]);

  const sendCommand = useCallback((agentId: string, command: any) => {
    if (wsRef.current && wsRef.current.readyState === WebSocket.OPEN) {
      wsRef.current.send(JSON.stringify({
        type: 'send_command',
        agentId,
        command
      }));
    } else {
      console.warn('Cannot send command: WebSocket is not open');
    }
  }, []);

  return { agents, isConnected, error, sendCommand };
}
