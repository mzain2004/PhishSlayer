require('dotenv').config({path: require('path').resolve(__dirname, '.env.local')});
const { createServer } = require('http');
const { parse } = require('url');
const next = require('next');
const { WebSocketServer } = require('ws');


const dev = process.env.NODE_ENV !== 'production';
const app = next({ dev });
const handle = app.getRequestHandler();
const { createClient } = require('@supabase/supabase-js');

const supabaseAdmin = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
);

// Store connected agents
const connectedAgents = new Map();
// agentId → { ws, hostname, platform, lastSeen, threatCount }

// In-Memory Rate Limiting against Thundering Herd
// IMPORTANT: Do NOT enable PM2 cluster mode. The WebSocket server uses in-process agent state. 
// Cluster mode would break agent routing across workers and isolate this IP tracking Map.
const ipConnectionMap = new Map();

// Expose to Next.js API routes
global.connectedAgents = connectedAgents;
global.ipConnectionMap = ipConnectionMap;

setInterval(() => {
  const now = Date.now();
  for (const [ip, timestamps] of ipConnectionMap.entries()) {
    const active = timestamps.filter(t => now - t < 60000);
    if (active.length === 0) {
      ipConnectionMap.delete(ip);
    } else {
      ipConnectionMap.set(ip, active);
    }
  }
}, 5 * 60 * 1000); // Clean up stale Map entries every 5 minutes

app.prepare().then(() => {
  const server = createServer((req, res) => {
    const parsedUrl = parse(req.url, true);
    handle(req, res, parsedUrl);
  });

  const wss = new WebSocketServer({
    noServer: true,
    perMessageDeflate: false,
  });

  wss.on('connection', (ws, req) => {
    // Rate Limiting
    const ip = req.socket.remoteAddress;
    if (ip) {
      const now = Date.now();
      const timestamps = ipConnectionMap.get(ip) || [];
      const recent = timestamps.filter(t => now - t < 60000);
      if (recent.length > 10) {
        console.warn(`[WSServer] Rate limited: ${ip}`);
        ws.close(1008, 'Rate limited');
        return;
      }
    }

    // Validate AGENT_SECRET
    const secret = req.headers['x-agent-secret'];
    if (secret !== process.env.AGENT_SECRET) {
      console.warn(`[WSServer] Rejected connection: invalid secret. Received: "${secret}", Expected: "${process.env.AGENT_SECRET}"`);
      ws.close(1008, 'Unauthorized');
      return;
    }

    const agentId = req.headers['x-agent-id'];
    const userId = req.headers['x-user-id'];
    const hostname = req.headers['x-hostname'];
    const platform = req.headers['x-platform'];

    console.log(`[WSServer] Agent connected: ${agentId} (${hostname}) for user ${userId}`);

    // Register agent
    connectedAgents.set(agentId, {
      ws,
      userId,
      hostname,
      platform,
      lastSeen: new Date().toISOString(),
      threatCount: 0,
      status: 'online',
    });

    // DB Sync (Persistent Heartbeat)
    supabaseAdmin.from('agents').upsert({
      id: agentId,
      user_id: userId,
      hostname,
      os: platform,
      status: 'online',
      last_seen: new Date().toISOString(),
    }).then(({ error }) => {
      if (error) console.error('[WSServer] DB Sync Error (Connect):', error.message);
    });

    // Broadcast agent list update to dashboard clients
    console.log(`[WSServer] Agent registered: ${agentId}, waiting for messages...`);
    broadcastAgentUpdate();

    ws.on('message', (data) => {
      console.log('[WSServer] Raw message received from agent:', data.toString().substring(0, 200));
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
        
        // DB Offline Sync
        supabaseAdmin.from('agents').update({
          status: 'offline',
          last_seen: agent.lastSeen
        }).eq('id', agentId).then(({ error }) => {
          if (error) console.error('[WSServer] DB Sync Error (Disconnect):', error.message);
        });
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
        agent.lastSeen = new Date().toISOString();
        agent.ws.send(JSON.stringify({ type: 'pong' }), { compress: false, binary: false });
        
        // DB Heartbeat Sync
        supabaseAdmin.from('agents').update({
          last_seen: agent.lastSeen,
          status: 'online'
        }).eq('id', agentId).then(({ error }) => {
          if (error) console.error('[WSServer] DB Heartbeat Error:', error.message);
        });
        break;
      case 'mitigation_log':
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
    noServer: true,
    perMessageDeflate: false,
  });

  const existingUpgradeListeners = server.listeners('upgrade').slice(0);
  server.removeAllListeners('upgrade');

  server.on('upgrade', (req, socket, head) => {
    const pathname = parse(req.url).pathname;
    if (pathname === '/api/agent/ws') {
      wss.handleUpgrade(req, socket, head, (ws) => {
        wss.emit('connection', ws, req);
      });
    } else if (pathname === '/api/dashboard/ws') {
      dashboardWss.handleUpgrade(req, socket, head, (ws) => {
        dashboardWss.emit('connection', ws, req);
      });
    } else {
      for (const listener of existingUpgradeListeners) {
        listener(req, socket, head);
      }
    }
  });

  dashboardWss.on('connection', (ws, req) => {
    // Rate Limiting
    const ip = req.socket.remoteAddress;
    if (ip) {
      const now = Date.now();
      const timestamps = ipConnectionMap.get(ip) || [];
      const recent = timestamps.filter(t => now - t < 60000);
      if (recent.length > 10) {
        console.warn(`[WSServer] Rate limited: ${ip}`);
        ws.close(1008, 'Rate limited');
        return;
      }
    }

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
      console.log('[WSServer] Received from agent:', data.toString().substring(0, 100));
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

  function sendCommandToAgent(target, command) {
    let agent;
    for (const [id, a] of connectedAgents.entries()) {
      if (a.hostname === target || id === target) {
        agent = a;
        break;
      }
    }

    if (!agent || agent.ws.readyState !== 1) {
      console.warn(`[WSServer] Agent ${target} not available`);
      return;
    }
    const cmd = {
      ...command,
      commandId: require('crypto').randomUUID(),
      timestamp: new Date().toISOString(),
    };
    agent.ws.send(JSON.stringify(cmd), { compress: false, binary: false });
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









