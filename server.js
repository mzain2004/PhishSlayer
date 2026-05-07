require("dotenv").config({
  path: require("path").resolve(__dirname, ".env.local"),
});
const { createServer } = require("http");
const { parse } = require("url");
const next = require("next");
const { WebSocketServer } = require("ws");
const { verifyToken } = require("@clerk/backend");

const dev = process.env.NODE_ENV !== "production";
const app = next({ dev });
const handle = app.getRequestHandler();
const { createClient } = require("@supabase/supabase-js");

const supabaseAdmin = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY,
);

// ── Auth helpers for dashboard WebSocket (C3) ────────────────────────
function parseCookies(header) {
  const out = {};
  if (!header) return out;
  for (const part of header.split(";")) {
    const idx = part.indexOf("=");
    if (idx === -1) continue;
    const k = part.slice(0, idx).trim();
    const v = part.slice(idx + 1).trim();
    if (k) out[k] = decodeURIComponent(v);
  }
  return out;
}

// Verify the Clerk session cookie on a raw upgrade request and return the
// internal Supabase organizations.id UUID for the active Clerk org.
async function authenticateDashboardRequest(req) {
  try {
    const cookies = parseCookies(req.headers.cookie);
    const sessionToken = cookies.__session;
    if (!sessionToken) return null;

    const payload = await verifyToken(sessionToken, {
      secretKey: process.env.CLERK_SECRET_KEY,
    });
    const userId = payload?.sub;
    const clerkOrgId = payload?.org_id || payload?.o?.id;
    if (!userId || !clerkOrgId) return null;

    const { data, error } = await supabaseAdmin
      .from("organizations")
      .select("id")
      .eq("clerk_org_id", clerkOrgId)
      .maybeSingle();
    if (error || !data) return null;

    return { userId, organizationId: data.id };
  } catch {
    return null;
  }
}

// Look up the internal organization UUID for an agent's owning user
async function resolveAgentOrganizationId(userId) {
  if (!userId) return null;
  const { data, error } = await supabaseAdmin
    .from("organization_members")
    .select("organization_id")
    .eq("user_id", userId)
    .maybeSingle();
  if (error || !data) return null;
  return data.organization_id;
}

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

setInterval(
  () => {
    const now = Date.now();
    for (const [ip, timestamps] of ipConnectionMap.entries()) {
      const active = timestamps.filter((t) => now - t < 60000);
      if (active.length === 0) {
        ipConnectionMap.delete(ip);
      } else {
        ipConnectionMap.set(ip, active);
      }
    }
  },
  5 * 60 * 1000,
); // Clean up stale Map entries every 5 minutes

app.prepare().then(() => {
  const server = createServer((req, res) => {
    const parsedUrl = parse(req.url, true);
    handle(req, res, parsedUrl);
  });

  const wss = new WebSocketServer({
    noServer: true,
    perMessageDeflate: false,
  });

  wss.on("connection", (ws, req) => {
    // Rate Limiting
    const ip = req.socket.remoteAddress;
    if (ip) {
      const now = Date.now();
      const timestamps = ipConnectionMap.get(ip) || [];
      const recent = timestamps.filter((t) => now - t < 60000);
      if (recent.length > 10) {
        console.warn(`[WSServer] Rate limited: ${ip}`);
        ws.close(1008, "Rate limited");
        return;
      }
    }

    // Validate AGENT_SECRET
    const secret = req.headers["x-agent-secret"];
    if (secret !== process.env.AGENT_SECRET) {
      console.warn(`[WSServer] Rejected connection: invalid secret`);
      ws.close(1008, "Unauthorized");
      return;
    }

    const agentId = req.headers["x-agent-id"];
    const userId = req.headers["x-user-id"];
    const hostname = req.headers["x-hostname"];
    const platform = req.headers["x-platform"];

    console.log(
      `[WSServer] Agent connected: ${agentId} (${hostname}) for user ${userId}`,
    );

    // Register agent
    connectedAgents.set(agentId, {
      ws,
      userId,
      organizationId: null,
      hostname,
      platform,
      lastSeen: new Date().toISOString(),
      threatCount: 0,
      status: "online",
    });

    // Resolve agent's organization for tenant-scoped broadcasts (C3)
    resolveAgentOrganizationId(userId).then((organizationId) => {
      const a = connectedAgents.get(agentId);
      if (a) a.organizationId = organizationId;
      broadcastAgentUpdate(organizationId);
    });

    // DB Sync (Persistent Heartbeat)
    supabaseAdmin
      .from("agents")
      .upsert({
        id: agentId,
        user_id: userId,
        hostname,
        os: platform,
        status: "online",
        last_seen: new Date().toISOString(),
      })
      .then(({ error }) => {
        if (error)
          console.error("[WSServer] DB Sync Error (Connect):", error.message);
      });

    console.log(
      `[WSServer] Agent registered: ${agentId}, waiting for messages...`,
    );

    ws.on("message", (data) => {
      console.log(
        "[WSServer] Raw message received from agent:",
        data.toString().substring(0, 200),
      );
      try {
        const msg = JSON.parse(data.toString());
        handleAgentMessage(agentId, msg);
      } catch (err) {
        console.error("[WSServer] Parse error:", err);
      }
    });

    ws.on("close", () => {
      console.log(`[WSServer] Agent disconnected: ${agentId}`);
      const agent = connectedAgents.get(agentId);
      let agentOrgId = null;
      if (agent) {
        agent.status = "offline";
        agent.lastSeen = new Date().toISOString();
        agentOrgId = agent.organizationId;

        // DB Offline Sync
        supabaseAdmin
          .from("agents")
          .update({
            status: "offline",
            last_seen: agent.lastSeen,
          })
          .eq("id", agentId)
          .then(({ error }) => {
            if (error)
              console.error(
                "[WSServer] DB Sync Error (Disconnect):",
                error.message,
              );
          });
      }
      broadcastAgentUpdate(agentOrgId);
    });

    ws.on("error", (err) => {
      console.error(`[WSServer] Agent error (${agentId}):`, err.message);
    });
  });

  function handleAgentMessage(agentId, msg) {
    const agent = connectedAgents.get(agentId);
    if (!agent) return;

    agent.lastSeen = new Date().toISOString();

    switch (msg.type) {
      case "ping":
        agent.lastSeen = new Date().toISOString();
        agent.ws.send(JSON.stringify({ type: "pong" }), {
          compress: false,
          binary: false,
        });

        // DB Heartbeat Sync
        supabaseAdmin
          .from("agents")
          .update({
            last_seen: agent.lastSeen,
            status: "online",
          })
          .eq("id", agentId)
          .then(({ error }) => {
            if (error)
              console.error("[WSServer] DB Heartbeat Error:", error.message);
          });
        break;
      case "mitigation_log":
      case "fim_event":
      case "process_event":
      case "network_event":
        // Update threat count if suspicious
        if (msg.event?.suspicious) {
          agent.threatCount++;
        }
        // Forward to dashboard clients (org-scoped)
        broadcastTelemetry(agentId, agent.organizationId, msg);
        break;
      case "command_result":
        // Forward result to dashboard (org-scoped)
        broadcastCommandResult(agentId, agent.organizationId, msg);
        break;
      case "agent_register":
        console.log(`[WSServer] Agent registered: ${msg.hostname}`);
        broadcastAgentUpdate(agent.organizationId);
        break;
    }
  }

  // Dashboard WebSocket clients (browser connections)
  // Map<ws, { organizationId, userId }> — tagged at upgrade time for tenant isolation (C3)
  const dashboardClients = new Map();

  // Separate WSS for dashboard on /api/dashboard/ws
  const dashboardWss = new WebSocketServer({
    noServer: true,
    perMessageDeflate: false,
  });

  const existingUpgradeListeners = server.listeners("upgrade").slice(0);
  server.removeAllListeners("upgrade");

  server.on("upgrade", async (req, socket, head) => {
    const pathname = parse(req.url).pathname;
    if (pathname === "/api/agent/ws") {
      wss.handleUpgrade(req, socket, head, (ws) => {
        wss.emit("connection", ws, req);
      });
    } else if (pathname === "/api/dashboard/ws") {
      // C3: authenticate via Clerk session cookie before upgrading
      const auth = await authenticateDashboardRequest(req);
      if (!auth) {
        socket.write("HTTP/1.1 401 Unauthorized\r\n\r\n");
        socket.destroy();
        return;
      }
      dashboardWss.handleUpgrade(req, socket, head, (ws) => {
        ws._auth = auth;
        dashboardWss.emit("connection", ws, req);
      });
    } else {
      for (const listener of existingUpgradeListeners) {
        listener(req, socket, head);
      }
    }
  });

  dashboardWss.on("connection", (ws, req) => {
    // Rate Limiting
    const ip = req.socket.remoteAddress;
    if (ip) {
      const now = Date.now();
      const timestamps = ipConnectionMap.get(ip) || [];
      const recent = timestamps.filter((t) => now - t < 60000);
      if (recent.length > 10) {
        console.warn(`[WSServer] Rate limited: ${ip}`);
        ws.close(1008, "Rate limited");
        return;
      }
    }

    const { organizationId, userId } = ws._auth;
    dashboardClients.set(ws, { organizationId, userId });
    console.log(
      `[WSServer] Dashboard client connected: org=${organizationId}`,
    );

    // Send current org-scoped agent list immediately
    ws.send(
      JSON.stringify({
        type: "agent_list",
        agents: getAgentList(organizationId),
      }),
    );

    ws.on("close", () => {
      dashboardClients.delete(ws);
    });

    // Handle commands from dashboard
    ws.on("message", (data) => {
      console.log(
        "[WSServer] Received from dashboard:",
        data.toString().substring(0, 100),
      );
      try {
        const msg = JSON.parse(data.toString());
        if (msg.type === "send_command") {
          sendCommandToAgent(msg.agentId, msg.command, organizationId);
        }
      } catch (err) {
        console.error("[WSServer] Dashboard parse error:", err);
      }
    });
  });

  function sendCommandToAgent(target, command, requesterOrgId) {
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
    // C3: only allow commands when the requesting client owns the agent's org
    if (
      requesterOrgId !== undefined &&
      requesterOrgId !== null &&
      agent.organizationId !== requesterOrgId
    ) {
      console.warn(
        `[WSServer] Cross-tenant command blocked: target=${target} requesterOrg=${requesterOrgId} agentOrg=${agent.organizationId}`,
      );
      return;
    }
    const cmd = {
      ...command,
      commandId: require("crypto").randomUUID(),
      timestamp: new Date().toISOString(),
    };
    agent.ws.send(JSON.stringify(cmd), { compress: false, binary: false });
    console.log(`[WSServer] Command sent to ${target}:`, cmd.command);
  }

  function getAgentList(orgFilter) {
    return Array.from(connectedAgents.entries())
      .filter(([_, agent]) =>
        orgFilter === undefined ? true : agent.organizationId === orgFilter,
      )
      .map(([id, agent]) => ({
        agentId: id,
        hostname: agent.hostname,
        platform: agent.platform,
        status: agent.status,
        lastSeen: agent.lastSeen,
        threatCount: agent.threatCount,
      }));
  }

  // C3: send only to dashboard clients in the matching organization
  function sendToOrg(orgId, payload) {
    if (!orgId) return;
    dashboardClients.forEach((meta, client) => {
      if (client.readyState === 1 && meta.organizationId === orgId) {
        client.send(payload);
      }
    });
  }

  function broadcastAgentUpdate(orgId) {
    if (!orgId) return;
    const msg = JSON.stringify({
      type: "agent_list",
      agents: getAgentList(orgId),
    });
    sendToOrg(orgId, msg);
  }

  function broadcastTelemetry(agentId, orgId, msg) {
    const payload = JSON.stringify({
      type: "telemetry",
      agentId,
      ...msg,
    });
    sendToOrg(orgId, payload);
  }

  function broadcastCommandResult(agentId, orgId, msg) {
    const payload = JSON.stringify({
      type: "command_result",
      agentId,
      ...msg,
    });
    sendToOrg(orgId, payload);
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
    console.log(
      `[Server] WebSocket endpoint: ws://localhost:${PORT}/api/agent/ws`,
    );
  });
});
