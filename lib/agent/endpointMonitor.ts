import { exec } from "child_process";
import { promisify } from "util";
import os from "os";
import chokidar from 'chokidar';
import crypto from 'crypto';
import fs from 'fs';
import psList from 'ps-list';
import WebSocket from 'ws';

const execAsync = promisify(exec);

// Configuration
const POLL_INTERVAL_MS = 10000;
const API_ENDPOINT = process.env.NEXT_PUBLIC_SITE_URL
  ? `${process.env.NEXT_PUBLIC_SITE_URL}/api/flag-ioc`
  : undefined;

// Cache to avoid spamming the same IPs
const seenConnections = new Set<string>();

// Beaconing detection: track connection frequency per process-IP pair
const connectionFrequency = new Map<string, number[]>();

// Process reputation
const SAFE_PROCESSES = new Set([
  "chrome", "firefox", "node", "nginx", "sshd", "python",
  "python3", "curl", "wget", "git", "npm", "next", "code", "slack", "zoom",
  "spotify", "docker", "kubectl", "postgres", "redis-server", "mongod",
]);

/**
 * Normalizes the osquery execution command based on the OS.
 */
function getOsqueryCommand(query: string): string {
  const escapedQuery = query.replace(/"/g, '\\"');
  return `osqueryi --json "${escapedQuery}"`;
}

/**
 * Fallback mechanism if osquery is not installed or fails
 */
async function fallbackNetworkCheck(): Promise<any[]> {
  const platform = os.platform();
  try {
    if (platform === "win32") {
      const { stdout } = await execAsync("netstat -ano");
      const lines = stdout.split("\\n").filter((l) => l.includes("ESTABLISHED"));
      return lines.map((line) => {
        const parts = line.trim().split(/\\s+/);
        return {
          name: "unknown_fallback",
          pid: parts[4] || "0",
          remote_address: parts[2]?.split(":")[0] || "unknown",
          remote_port: parts[2]?.split(":")[1] || "0",
        };
      });
    } else {
      const { stdout } = await execAsync("netstat -tnup");
      const lines = stdout.split("\\n").filter((l) => l.includes("ESTABLISHED"));
      return lines.map((line) => {
        const parts = line.trim().split(/\\s+/);
        const pidName = parts[6] || "/";
        return {
          name: pidName.split("/")[1] || "unknown_fallback",
          pid: pidName.split("/")[0] || "0",
          remote_address: parts[4]?.split(":")[0] || "unknown",
          remote_port: parts[4]?.split(":")[1] || "0",
        };
      });
    }
  } catch (error) {
    console.error("[EndpointMonitor] Fallback network check failed:", error);
    return [];
  }
}

/**
 * Detects beaconing behavior: 5+ connections to same target in < 60 seconds
 */
function checkBeaconing(processName: string, remoteAddress: string): boolean {
  const key = `${processName}-${remoteAddress}`;
  const now = Date.now();
  const timestamps = connectionFrequency.get(key) || [];
  timestamps.push(now);

  // Keep only timestamps from last 2 minutes to avoid memory leak
  const recent = timestamps.filter((t) => now - t < 120_000);
  connectionFrequency.set(key, recent);

  if (recent.length >= 5) {
    const span = recent[recent.length - 1] - recent[0];
    return span < 60_000;
  }
  return false;
}

/**
 * Polls active network connections using osquery
 */
async function pollNetworkActivity(userId: string) {
  if (!API_ENDPOINT) {
    console.error("[EndpointMonitor] NEXT_PUBLIC_SITE_URL not set. Skipping poll.");
    return;
  }

  const query = `
    SELECT p.name, p.pid, pos.remote_address, pos.remote_port 
    FROM process_open_sockets pos 
    JOIN processes p ON pos.pid = p.pid 
    WHERE pos.remote_address != '' 
      AND pos.remote_address != '127.0.0.1' 
      AND pos.remote_address != '::1'
      AND pos.remote_address != '0.0.0.0'
      AND pos.remote_address NOT LIKE '192.168.%'
      AND pos.remote_address NOT LIKE '10.%'
      AND pos.remote_address NOT LIKE '172.%';
  `;

  let connections: any[] = [];
  const command = getOsqueryCommand(query);

  try {
    const { stdout } = await execAsync(command);
    if (stdout.trim()) {
      connections = JSON.parse(stdout);
    }
  } catch (error: any) {
    console.warn(`[EndpointMonitor] osquery failed, using fallback: ${error.message}`);
    connections = await fallbackNetworkCheck();
  }

  // Process connections and find anomalies
  const anomalies = [];

  for (const conn of connections) {
    if (!conn.remote_address || conn.remote_address === "unknown") continue;

    const connectionKey = `${conn.pid}-${conn.remote_address}:${conn.remote_port}`;
    const processName = conn.name || "unknown";

    // Check beaconing regardless of seen status
    const isBeaconing = checkBeaconing(processName, conn.remote_address);

    // Check process reputation
    const suspiciousProcess = !SAFE_PROCESSES.has(processName.toLowerCase());

    if (!seenConnections.has(connectionKey) || isBeaconing) {
      seenConnections.add(connectionKey);

      console.log(
        `[EndpointMonitor] 🔍 ${isBeaconing ? "⚠️ BEACONING " : ""}Connection: ${processName} (PID: ${conn.pid}) -> ${conn.remote_address}:${conn.remote_port}${suspiciousProcess ? " [SUSPICIOUS PROCESS]" : ""}`
      );

      anomalies.push({
        userId,
        processName,
        pid: conn.pid,
        remoteAddress: conn.remote_address,
        remotePort: conn.remote_port,
        timestamp: new Date().toISOString(),
        threatLevel: isBeaconing ? "critical" : "medium",
        source: "agent_telemetry",
        isBeaconing,
        suspiciousProcess,
      });
    }
  }

  // POST anomalies to the dashboard API
  if (anomalies.length > 0) {
    try {
      const response = await fetch(API_ENDPOINT, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "Authorization": `Bearer ${process.env.AGENT_SECRET || ""}`,
        },
        body: JSON.stringify({ events: anomalies }),
      });

      if (!response.ok) {
        console.error(`[EndpointMonitor] Failed to flag IOCs: ${response.status} ${response.statusText}`);
      } else {
        const result = await response.json();
        console.log(
          `[EndpointMonitor] 🛡️ Flagged ${anomalies.length} connections. Processed: ${result.processed}, Critical/High: ${result.flagged}`
        );
      }
    } catch (apiError) {
      console.error("[EndpointMonitor] API Request Error:", apiError);
    }
  }
}

/**
 * Starts the endpoint monitoring loop.
 */
export async function startMonitoring(userId: string) {
  console.log(`[EndpointMonitor] 🚀 Starting endpoint anomaly detection for user: ${userId}`);
  console.log(`[EndpointMonitor] Platform: ${os.platform()} | Polling Interval: ${POLL_INTERVAL_MS}ms`);
  console.log(`[EndpointMonitor] API Endpoint: ${API_ENDPOINT || "NOT SET"}`);

  await pollNetworkActivity(userId);

  setInterval(async () => {
    await pollNetworkActivity(userId);
  }, POLL_INTERVAL_MS);
}

// ==========================================
// PHASE 1: LOCAL EDR SENSOR EXTENSION
// ==========================================

interface FIMEvent {
  type: 'add' | 'change' | 'unlink';
  path: string;
  timestamp: string;
  hash?: string;
  size?: number;
  suspicious: boolean;
  reason?: string;
}

class FileIntegrityMonitor {
  private watcher: any = null; // using any since chokidar namespace might be missing or different
  private baselineHashes: Map<string, string> = new Map();

  // High-risk paths to monitor by OS
  private getWatchPaths(): string[] {
    if (process.platform === 'win32') {
      return [
        'C:\\Windows\\System32\\drivers',
        'C:\\Windows\\System32\\tasks',
        (process.env.APPDATA || '') + '\\Microsoft\\Windows\\Start Menu\\Programs\\Startup',
        process.env.TEMP || 'C:\\Temp',
      ];
    } else if (process.platform === 'darwin') {
      return [
        '/etc',
        '/Library/LaunchDaemons',
        '/Library/LaunchAgents',
        (process.env.HOME || '') + '/Library/LaunchAgents',
      ];
    } else {
      return [
        '/etc/cron.d',
        '/etc/cron.daily',
        '/etc/systemd/system',
        '/tmp',
        '/var/tmp',
      ];
    }
  }

  private computeHash(filePath: string): string | null {
    try {
      const buffer = fs.readFileSync(filePath);
      return crypto.createHash('sha256').update(buffer).digest('hex');
    } catch {
      return null;
    }
  }

  private isSuspicious(event: Partial<FIMEvent>): {
    suspicious: boolean;
    reason?: string;
  } {
    const path = event.path || '';
    
    // Suspicious file extensions
    const dangerousExts = [
      '.exe', '.dll', '.bat', '.ps1', '.vbs', 
      '.sh', '.py', '.rb', '.pl'
    ];
    const ext = path.substring(path.lastIndexOf('.')).toLowerCase();
    if (dangerousExts.includes(ext) && event.type === 'add') {
      return { 
        suspicious: true, 
        reason: `New executable file created: ${ext}` 
      };
    }

    // Hash changed on critical file
    if (event.type === 'change' && path.toLowerCase().includes('system32')) {
      return { 
        suspicious: true, 
        reason: 'System file modified' 
      };
    }

    // File added to startup location
    if (
      path.toLowerCase().includes('startup') || 
      path.toLowerCase().includes('launchdaemon')
    ) {
      return { 
        suspicious: true, 
        reason: 'File added to startup/persistence location' 
      };
    }

    return { suspicious: false };
  }

  start(onEvent: (event: FIMEvent) => void): void {
    const paths = this.getWatchPaths();
    
    console.log('[FIM] Starting file integrity monitor...');
    console.log('[FIM] Watching paths:', paths);

    this.watcher = chokidar.watch(paths, {
      persistent: true,
      ignoreInitial: false,
      depth: 2,
      awaitWriteFinish: { stabilityThreshold: 500 },
      ignored: /(^|[\/\\])\../, // ignore hidden files
    });

    // Build baseline on 'add' events during initial scan
    this.watcher.on('add', (filePath: string) => {
      const hash = this.computeHash(filePath);
      if (hash) this.baselineHashes.set(filePath, hash);
    });

    // Detect changes after initial scan
    this.watcher.on('ready', () => {
      console.log(
        `[FIM] Baseline established. Monitoring ${
          this.baselineHashes.size
        } files.`
      );

      // Now wire up change/add/unlink events
      this.watcher!.on('change', (filePath: string) => {
        const newHash = this.computeHash(filePath);
        const oldHash = this.baselineHashes.get(filePath);
        
        if (newHash && newHash !== oldHash) {
          const { suspicious, reason } = this.isSuspicious({ 
            type: 'change', 
            path: filePath 
          });
          const event: FIMEvent = {
            type: 'change',
            path: filePath,
            timestamp: new Date().toISOString(),
            hash: newHash,
            suspicious,
            reason,
          };
          this.baselineHashes.set(filePath, newHash);
          console.log('[FIM] Change detected:', event);
          onEvent(event);
        }
      });

      this.watcher!.on('add', (filePath: string) => {
        const { suspicious, reason } = this.isSuspicious({ 
          type: 'add', 
          path: filePath 
        });
        if (suspicious) {
          const event: FIMEvent = {
            type: 'add',
            path: filePath,
            timestamp: new Date().toISOString(),
            hash: this.computeHash(filePath) || undefined,
            suspicious: true,
            reason,
          };
          console.log('[FIM] Suspicious file added:', event);
          onEvent(event);
        }
      });

      this.watcher!.on('unlink', (filePath: string) => {
        const event: FIMEvent = {
          type: 'unlink',
          path: filePath,
          timestamp: new Date().toISOString(),
          suspicious: false,
        };
        this.baselineHashes.delete(filePath);
        onEvent(event);
      });
    });

    this.watcher.on('error', (err: any) => {
      console.error('[FIM] Watcher error:', err);
    });
  }

  stop(): void {
    this.watcher?.close();
    console.log('[FIM] Stopped.');
  }
}

interface ProcessEvent {
  type: 'new_process' | 'terminated_process';
  pid: number;
  name: string;
  cmd?: string;
  timestamp: string;
  suspicious: boolean;
  reason?: string;
  threatScore: number;
}

class ProcessMonitor {
  private knownPids: Set<number> = new Set();
  private interval: NodeJS.Timeout | null = null;

  private readonly SUSPICIOUS_PROCESS_NAMES = [
    'mimikatz', 'meterpreter', 'netcat', 'nc.exe',
    'psexec', 'wce', 'fgdump', 'pwdump',
    'cobaltstrike', 'beacon', 'empire',
  ];

  private readonly SUSPICIOUS_CMD_PATTERNS = [
    /powershell.*-enc/i,        // encoded PS command
    /cmd.*\/c.*del/i,           // file deletion via cmd
    /net.*user.*\/add/i,        // adding users
    /schtasks.*\/create/i,      // scheduled task creation
    /regsvr32.*\/s.*\/u/i,      // regsvr32 abuse
    /certutil.*-decode/i,       // certutil abuse
    /wscript.*\.vbs/i,          // vbscript execution
  ];

  private scoreSuspiciousProcess(
    name: string, 
    cmd?: string
  ): { suspicious: boolean; reason: string; score: number } {
    // Check name against known bad processes
    const nameLower = name.toLowerCase();
    for (const bad of this.SUSPICIOUS_PROCESS_NAMES) {
      if (nameLower.includes(bad)) {
        return { 
          suspicious: true, 
          reason: `Known malicious process: ${bad}`, 
          score: 95 
        };
      }
    }

    // Check command line patterns
    if (cmd) {
      for (const pattern of this.SUSPICIOUS_CMD_PATTERNS) {
        if (pattern.test(cmd)) {
          return { 
            suspicious: true, 
            reason: `Suspicious command pattern: ${pattern}`, 
            score: 80 
          };
        }
      }
    }

    return { suspicious: false, reason: '', score: 0 };
  }

  async start(onEvent: (event: ProcessEvent) => void): Promise<void> {
    console.log('[ProcMon] Starting process monitor...');

    // Build initial baseline
    const initial = await psList();
    initial.forEach((p: any) => this.knownPids.add(p.pid));
    console.log(
      `[ProcMon] Baseline: ${this.knownPids.size} processes tracked.`
    );

    // Poll every 5 seconds
    this.interval = setInterval(async () => {
      try {
        const current = await psList();
        const currentPids = new Set(current.map((p: any) => p.pid));

        // Detect new processes
        for (const proc of current) {
          if (!this.knownPids.has(proc.pid)) {
            const { suspicious, reason, score } = 
              this.scoreSuspiciousProcess(proc.name, proc.cmd);
            
            const event: ProcessEvent = {
              type: 'new_process',
              pid: proc.pid,
              name: proc.name,
              cmd: proc.cmd,
              timestamp: new Date().toISOString(),
              suspicious,
              reason,
              threatScore: score,
            };

            if (suspicious) {
              console.warn('[ProcMon] Suspicious process detected:', event);
            }
            
            onEvent(event);
            this.knownPids.add(proc.pid);
          }
        }

        // Detect terminated processes
        for (const pid of this.knownPids) {
          if (!currentPids.has(pid)) {
            this.knownPids.delete(pid);
          }
        }
      } catch (err) {
        console.error('[ProcMon] Poll error:', err);
      }
    }, 5000);
  }

  stop(): void {
    if (this.interval) {
      clearInterval(this.interval);
      console.log('[ProcMon] Stopped.');
    }
  }
}

interface AgentCommand {
  command: 'block_ip' | 'kill_process' | 'quarantine_file' | 'ping';
  payload: {
    ip?: string;
    pid?: number;
    filePath?: string;
  };
  commandId: string;
}

class AgentWebSocket {
  private ws: WebSocket | null = null;
  private reconnectAttempts = 0;
  private readonly MAX_RECONNECT = 10;
  private readonly RECONNECT_DELAY = 5000;
  private isShuttingDown = false;
  private pingInterval: NodeJS.Timeout | null = null;

  private readonly serverUrl: string;
  private readonly agentSecret: string;
  private readonly agentId: string;
  private readonly onCommand: (cmd: AgentCommand) => void;

  constructor(
    serverUrl: string,
    agentSecret: string,
    agentId: string,
    onCommand: (cmd: AgentCommand) => void
  ) {
    this.serverUrl = serverUrl;
    this.agentSecret = agentSecret;
    this.agentId = agentId;
    this.onCommand = onCommand;
  }

  connect(): void {
    if (this.isShuttingDown) return;

    console.log(
      `[WSClient] Connecting to ${this.serverUrl} ` +
      `(attempt ${this.reconnectAttempts + 1})`
    );

    this.ws = new WebSocket(this.serverUrl, {
      headers: {
        'x-agent-secret': this.agentSecret,
        'x-agent-id': this.agentId,
        'x-hostname': os.hostname(),
        'x-platform': process.platform,
      },
    });

    this.ws.on('open', () => {
      console.log('[WSClient] Connected to Phish-Slayer cloud.');
      this.reconnectAttempts = 0;
      this.startPing();

      // Send registration message
      this.send({
        type: 'agent_register',
        agentId: this.agentId,
        hostname: os.hostname(),
        platform: process.platform,
        version: '1.0.0',
        timestamp: new Date().toISOString(),
      });
    });

    this.ws.on('message', (data: WebSocket.Data) => {
      try {
        const cmd: AgentCommand = JSON.parse(data.toString());
        console.log('[WSClient] Command received:', cmd);
        this.onCommand(cmd);
      } catch (err) {
        console.error('[WSClient] Failed to parse command:', err);
      }
    });

    this.ws.on('close', (code, reason) => {
      console.warn(
        `[WSClient] Disconnected. Code: ${code}, ` +
        `Reason: ${reason.toString()}`
      );
      this.stopPing();
      this.scheduleReconnect();
    });

    this.ws.on('error', (err: any) => {
      console.error('[WSClient] WebSocket error:', err.message);
    });
  }

  private startPing(): void {
    this.pingInterval = setInterval(() => {
      this.send({ type: 'ping', timestamp: new Date().toISOString() });
    }, 30000);
  }

  private stopPing(): void {
    if (this.pingInterval) {
      clearInterval(this.pingInterval);
      this.pingInterval = null;
    }
  }

  private scheduleReconnect(): void {
    if (this.isShuttingDown) return;
    if (this.reconnectAttempts >= this.MAX_RECONNECT) {
      console.error('[WSClient] Max reconnect attempts reached. Giving up.');
      return;
    }
    const delay = this.RECONNECT_DELAY * 
      Math.pow(1.5, this.reconnectAttempts); // exponential backoff
    console.log(`[WSClient] Reconnecting in ${delay}ms...`);
    this.reconnectAttempts++;
    setTimeout(() => this.connect(), delay);
  }

  send(data: object): void {
    if (this.ws?.readyState === WebSocket.OPEN) {
      this.ws.send(JSON.stringify(data));
    }
  }

  disconnect(): void {
    this.isShuttingDown = true;
    this.stopPing();
    this.ws?.close();
  }
}

class CommandExecutor {
  async blockIp(ip: string): Promise<{ success: boolean; output: string }> {
    // Validate IP format first
    const ipRegex = /^(\d{1,3}\.){3}\d{1,3}$/;
    if (!ipRegex.test(ip)) {
      return { success: false, output: 'Invalid IP format' };
    }

    // Prevent blocking localhost or private ranges
    const parts = ip.split('.').map(Number);
    if (
      parts[0] === 127 ||
      parts[0] === 10 ||
      (parts[0] === 172 && parts[1] >= 16 && parts[1] <= 31) ||
      (parts[0] === 192 && parts[1] === 168)
    ) {
      return { success: false, output: 'Refusing to block private IP' };
    }

    try {
      let cmd: string;
      if (process.platform === 'win32') {
        cmd = `netsh advfirewall firewall add rule name="PhishSlayer-Block-${ip}" ` +
              `dir=out action=block remoteip=${ip}`;
      } else if (process.platform === 'darwin') {
        cmd = `echo "block out quick from any to ${ip}" | sudo pfctl -ef -`;
      } else {
        cmd = `sudo iptables -A OUTPUT -d ${ip} -j DROP`;
      }

      const { stdout, stderr } = await execAsync(cmd);
      console.log(`[Executor] Blocked IP ${ip}:`, stdout || stderr);
      return { success: true, output: stdout || stderr };
    } catch (err: any) {
      console.error(`[Executor] Failed to block IP ${ip}:`, err.message);
      return { success: false, output: err.message };
    }
  }

  async killProcess(
    pid: number
  ): Promise<{ success: boolean; output: string }> {
    // Never allow killing system processes
    if (pid <= 4) {
      return { success: false, output: 'Refusing to kill system process' };
    }

    try {
      let cmd: string;
      if (process.platform === 'win32') {
        cmd = `taskkill /F /PID ${pid}`;
      } else {
        cmd = `kill -9 ${pid}`;
      }

      const { stdout, stderr } = await execAsync(cmd);
      console.log(`[Executor] Killed PID ${pid}:`, stdout || stderr);
      return { success: true, output: stdout || stderr };
    } catch (err: any) {
      console.error(`[Executor] Failed to kill PID ${pid}:`, err.message);
      return { success: false, output: err.message };
    }
  }

  async quarantineFile(
    filePath: string
  ): Promise<{ success: boolean; output: string }> {
    const quarantineDir = process.platform === 'win32'
      ? 'C:\\PhishSlayer\\Quarantine'
      : '/var/phishslayer/quarantine';

    try {
      await execAsync(
        process.platform === 'win32'
          ? `mkdir "${quarantineDir}" 2>nul & move "${filePath}" "${quarantineDir}"`
          : `mkdir -p "${quarantineDir}" && mv "${filePath}" "${quarantineDir}"`
      );
      console.log(`[Executor] Quarantined: ${filePath}`);
      return { success: true, output: `Moved to ${quarantineDir}` };
    } catch (err: any) {
      return { success: false, output: err.message };
    }
  }
}

async function main() {
  const AGENT_SECRET = process.env.AGENT_SECRET;
  const SERVER_URL = process.env.NEXT_PUBLIC_SITE_URL;

  if (!AGENT_SECRET || !SERVER_URL) {
    console.error('[Agent] Missing AGENT_SECRET or NEXT_PUBLIC_SITE_URL');
    process.exit(1);
  }

  const agentId = os.hostname() + '-' + process.pid;
  const executor = new CommandExecutor();

  // Initialize WebSocket connection
  const wsUrl = SERVER_URL.replace('https://', 'wss://')
                           .replace('http://', 'ws://') + 
                           '/api/agent/ws';
  
  const wsClient = new AgentWebSocket(
    wsUrl,
    AGENT_SECRET,
    agentId,
    async (cmd) => {
      console.log('[Agent] Executing command:', cmd.command);
      let result;

      switch (cmd.command) {
        case 'block_ip':
          result = await executor.blockIp(cmd.payload.ip!);
          break;
        case 'kill_process':
          result = await executor.killProcess(cmd.payload.pid!);
          break;
        case 'quarantine_file':
          result = await executor.quarantineFile(cmd.payload.filePath!);
          break;
        case 'ping':
          result = { success: true, output: 'pong' };
          break;
        default:
          result = { success: false, output: 'Unknown command' };
      }

      // Send result back to cloud
      wsClient.send({
        type: 'command_result',
        commandId: cmd.commandId,
        result,
        timestamp: new Date().toISOString(),
      });
    }
  );

  wsClient.connect();

  // Initialize FIM
  const fim = new FileIntegrityMonitor();
  fim.start(async (event) => {
    if (event.suspicious) {
      // POST to existing /api/flag-ioc endpoint
      await fetch(`${SERVER_URL}/api/flag-ioc`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${AGENT_SECRET}`,
        },
        body: JSON.stringify({
          source: 'fim',
          process_name: 'file_system',
          remote_address: event.path,
          details: event,
          threat_score: 70,
        }),
      });
    }
    // Stream to cloud via WebSocket
    wsClient.send({ type: 'fim_event', event });
  });

  // Initialize Process Monitor
  const procMon = new ProcessMonitor();
  await procMon.start(async (event) => {
    if (event.suspicious) {
      await fetch(`${SERVER_URL}/api/flag-ioc`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${AGENT_SECRET}`,
        },
        body: JSON.stringify({
          source: 'process_monitor',
          process_name: event.name,
          pid: event.pid,
          remote_address: '0.0.0.0',
          details: event,
          threat_score: event.threatScore,
        }),
      });
    }
    wsClient.send({ type: 'process_event', event });
  });

  // Keep existing network monitor running
  startMonitoring('standalone-agent'); 

  console.log('[Agent] Phish-Slayer EDR Agent running.');
  console.log('[Agent] Monitoring: Network + Files + Processes');
  console.log('[Agent] WebSocket: Connected to', wsUrl);

  // Graceful shutdown
  process.on('SIGINT', () => {
    console.log('[Agent] Shutting down...');
    wsClient.disconnect();
    fim.stop();
    procMon.stop();
    process.exit(0);
  });
}

// Ensure the module continues to function when imported by other files or started standalone
const isMain = process.argv[1] && (process.argv[1].includes('endpointMonitor') || process.argv[1].includes('ts-node'));
if (isMain) {
  main().catch(console.error);
}
