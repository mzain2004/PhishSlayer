'use client';

import { useAgentWebSocket } from '@/lib/hooks/useAgentWebSocket';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Terminal, Shield, Activity, Power, PowerOff, ShieldAlert } from 'lucide-react';
import { toast } from 'sonner';

export default function AgentDashboard() {
  const { agents, isConnected, sendCommand } = useAgentWebSocket();

  const handleCommand = async (agentId: string, cmd: string) => {
    try {
      // API call to the Next.js server so the server forwards via WS
      const res = await fetch('/api/agent/commands', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ agentId, command: cmd }),
      });
      const data = await res.json();
      if (res.ok) {
        toast.success(`Command '${cmd}' sent to agent ${agentId}`);
      } else {
        toast.error(`Failed to send command: ${data.error}`);
      }
    } catch (err) {
      toast.error('Error sending command');
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-4">
        <Badge variant={isConnected ? 'default' : 'destructive'} className="gap-2 px-3 py-1">
          {isConnected ? <Activity className="w-4 h-4" /> : <PowerOff className="w-4 h-4" />}
          {isConnected ? 'Controller Connected' : 'Controller Offline'}
        </Badge>
        <div className="text-sm text-muted-foreground">
          {agents.length} Agent{agents.length !== 1 ? 's' : ''} Online
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {agents.map((agent) => (
          <Card key={agent.agentId} className="border-primary/20 bg-card/60 backdrop-blur-md">
            <CardHeader className="pb-4">
              <div className="flex justify-between items-start">
                <div className="space-y-1">
                  <CardTitle className="flex items-center gap-2">
                    <Terminal className="w-5 h-5 text-primary" />
                    {agent.hostname}
                  </CardTitle>
                  <CardDescription className="text-xs font-mono text-muted-foreground truncate max-w-[200px]">
                    ID: {agent.agentId}
                  </CardDescription>
                </div>
                <Badge variant={agent.status === 'online' ? 'default' : 'secondary'}>
                  {agent.status}
                </Badge>
              </div>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                <div className="grid grid-cols-2 gap-4 text-sm">
                  <div>
                    <div className="text-muted-foreground">Platform</div>
                    <div className="capitalize">{agent.platform}</div>
                  </div>
                  <div>
                    <div className="text-muted-foreground">Total Threats</div>
                    <div className="flex items-center gap-2">
                      <ShieldAlert className={`w-4 h-4 ${agent.threatCount > 0 ? 'text-destructive' : 'text-muted-foreground'}`} />
                      {agent.threatCount}
                    </div>
                  </div>
                </div>

                <div className="pt-4 border-t border-border/50 flex gap-2">
                  <Button size="sm" variant="outline" onClick={() => handleCommand(agent.agentId, 'ping')}>
                    <Activity className="w-4 h-4 mr-2" /> Ping
                  </Button>
                  <Button size="sm" variant="destructive" onClick={() => handleCommand(agent.agentId, 'quarantine_file')}>
                    <Shield className="w-4 h-4 mr-2" /> Isolate
                  </Button>
                </div>
              </div>
            </CardContent>
          </Card>
        ))}
        {agents.length === 0 && (
          <div className="col-span-full h-48 flex flex-col items-center justify-center text-muted-foreground border border-dashed border-border/50 rounded-lg bg-card/10">
            <Power className="w-12 h-12 mb-4 opacity-50" />
            <p>No endpoints connected</p>
            <p className="text-sm mt-2">Deploy the agent script to see devices here.</p>
          </div>
        )}
      </div>
    </div>
  );
}
