const { createServer } = require('http');
const { parse } = require('url');
const next = require('next');
const { WebSocketServer } = require('ws');
require('dotenv').config({ 
  path: process.env.NODE_ENV === 'production' 
    ? '.env.production' 
    : '.env.local' 
});

const dev = process.env.NODE_ENV !== 'production';
const app = next({ dev });
const handle = app.getRequestHandler();

// Store connected agents
const connectedAgents = new Map();
// agentId → { ws, hostname, platform, lastSeen, threatCount }

app.prepare().then(() => {
  const server = createServer((req, res) => {
    const parsedUrl = parse(req.url, true);
    handle(req, res, parsedUrl);
  });

  // WebSocket server on /api/agent/ws path
  const wss = new WebSocketServer({ 
    server,
    path: '/api/agent/ws',
  });

  wss.on('connection', (ws, req) => {
    // Validate AGENT_SECRET
    const secret = req.headers['x-agent-secret'];
    if (secret !== process.env.AGENT_SECRET) {
      console.warn('[WSServer] Rejected connection: invalid secret');
      ws.close(1008, 'Unauthorized');
      return;
    }

    const agentId = req.headers['x-agent-id'];
    const hostname = req.headers['x-hostname'];
    const platform = req.headers['x-platform'];

    console.log(`[WSServer] Agent connected: ${agentId} (${hostname})`);

    // Register agent
    connectedAgents.set(agentId, {
      ws,
      hostname,
      platform,
      lastSeen: new Date().toISOString(),
      threatCount: 0,
      status: 'online',
    });

    // Broadcast agent list update to dashboard clients
    broadcastAgentUpdate();

    ws.on('message', (data) => {
      try {
        const msg = JSON.parse(data.toString());
        handleAgentMessage(agentId, msg);
      } catch (err) {
        console.error('[WSServer] Parse error:', err);
      }
    });

    ws.on('close', () => {
      console.log(`[WSServer] Agent disconnected: ${agentId}`);
      const agent = connectedAgents.get(agentId);
      if (agent) {
        agent.status = 'offline';
        agent.lastSeen = new Date().toISOString();
      }
      broadcastAgentUpdate();
    });

    ws.on('error', (err) => {
      console.error(`[WSServer] Agent error (${agentId}):`, err.message);
    });
  });

  function handleAgentMessage(agentId, msg) {
    const agent = connectedAgents.get(agentId);
    if (!agent) return;

    agent.lastSeen = new Date().toISOString();

    switch (msg.type) {
      case 'ping':
        agent.ws.send(JSON.stringify({ type: 'pong' }));
        break;
      case 'fim_event':
      case 'process_event':
      case 'network_event':
        // Update threat count if suspicious
        if (msg.event?.suspicious) {
          agent.threatCount++;
        }
        // Forward to dashboard clients
        broadcastTelemetry(agentId, msg);
        break;
      case 'command_result':
        // Forward result to dashboard
        broadcastCommandResult(agentId, msg);
        break;
      case 'agent_register':
        console.log(`[WSServer] Agent registered: ${msg.hostname}`);
        broadcastAgentUpdate();
        break;
    }
  }

  // Dashboard WebSocket clients (browser connections)
  const dashboardClients = new Set();

  // Separate WSS for dashboard on /api/dashboard/ws
  const dashboardWss = new WebSocketServer({
    server,
    path: '/api/dashboard/ws',
  });

  dashboardWss.on('connection', (ws, req) => {
    // Validate Supabase session via cookie or token header
    // For now: accept all connections from localhost
    dashboardClients.add(ws);
    console.log('[WSServer] Dashboard client connected');

    // Send current agent list immediately
    ws.send(JSON.stringify({
      type: 'agent_list',
      agents: getAgentList(),
    }));

    ws.on('close', () => {
      dashboardClients.delete(ws);
    });

    // Handle commands from dashboard
    ws.on('message', (data) => {
      try {
        const msg = JSON.parse(data.toString());
        if (msg.type === 'send_command') {
          sendCommandToAgent(msg.agentId, msg.command);
        }
      } catch (err) {
        console.error('[WSServer] Dashboard parse error:', err);
      }
    });
  });

  function sendCommandToAgent(agentId, command) {
    const agent = connectedAgents.get(agentId);
    if (!agent || agent.ws.readyState !== 1) {
      console.warn(`[WSServer] Agent ${agentId} not available`);
      return;
    }
    const cmd = {
      ...command,
      commandId: require('crypto').randomUUID(),
      timestamp: new Date().toISOString(),
    };
    agent.ws.send(JSON.stringify(cmd));
    console.log(`[WSServer] Command sent to ${agentId}:`, cmd.command);
  }

  function getAgentList() {
    return Array.from(connectedAgents.entries()).map(([id, agent]) => ({
      agentId: id,
      hostname: agent.hostname,
      platform: agent.platform,
      status: agent.status,
      lastSeen: agent.lastSeen,
      threatCount: agent.threatCount,
    }));
  }

  function broadcastAgentUpdate() {
    const msg = JSON.stringify({
      type: 'agent_list',
      agents: getAgentList(),
    });
    dashboardClients.forEach(client => {
      if (client.readyState === 1) client.send(msg);
    });
  }

  function broadcastTelemetry(agentId, msg) {
    const payload = JSON.stringify({
      type: 'telemetry',
      agentId,
      ...msg,
    });
    dashboardClients.forEach(client => {
      if (client.readyState === 1) client.send(payload);
    });
  }

  function broadcastCommandResult(agentId, msg) {
    const payload = JSON.stringify({
      type: 'command_result',
      agentId,
      ...msg,
    });
    dashboardClients.forEach(client => {
      if (client.readyState === 1) client.send(payload);
    });
  }

  // Expose agent control globally for API routes
  global.agentControl = {
    sendCommandToAgent,
    getAgentList,
    connectedAgents,
  };

  const PORT = process.env.PORT || 3000;
  server.listen(PORT, () => {
    console.log(`[Server] Phish-Slayer running on port ${PORT}`);
    console.log(`[Server] WebSocket endpoint: ws://localhost:${PORT}/api/agent/ws`);
  });
});
