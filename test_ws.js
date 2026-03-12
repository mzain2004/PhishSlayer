const WebSocket = require('ws');
const ws = new WebSocket('ws://localhost:3000/api/agent/ws', {
  headers: {
    'x-agent-secret': process.env.AGENT_SECRET || 'PhSlyr_Agent_2026!xK9',
    'x-agent-id': 'mock-agent-123',
    'x-hostname': 'test-machine',
    'x-platform': 'win32'
  }
});
ws.on('open', () => {
  console.log('TEST_AGENT_SUCCESS: Connected');
  ws.send(JSON.stringify({ type: 'ping', timestamp: new Date().toISOString() }));
});
ws.on('message', (msg) => console.log('Message from server:', msg.toString()));
ws.on('close', (c, r) => console.log('CLOSED:', c, r.toString()));
ws.on('error', (e) => console.error('ERROR:', e.message));

setTimeout(() => {
  console.log('Timeout, exiting...');
  ws.close();
  process.exit(0);
}, 3000);
