const WebSocket = require('ws');
const dotenv = require('dotenv');
const path = require('path');

dotenv.config({ path: path.resolve(process.cwd(), '.env.local') });

const url = 'ws://localhost:3002';
const secret = process.env.AGENT_SECRET;

console.log('Connecting to:', url);
console.log('Using secret:', secret ? 'FOUND' : 'MISSING');

const ws = new WebSocket(url, {
  perMessageDeflate: false,
  headers: {
    'x-agent-secret': secret,
    'x-agent-id': 'b8888888-8888-4888-8888-888888888888',
    'x-user-id': '1e4f7048-09e0-4fec-85d8-36d69d48b2ad',
    'x-hostname': 'test-host',
    'x-platform': 'test-platform',
  }
});

ws.on('open', () => {
  console.log('Connected!');
  ws.send(JSON.stringify({ type: 'ping' }));
});

ws.on('message', (data) => {
  console.log('Message received:', data.toString());
  process.exit(0);
});

ws.on('error', (err) => {
  console.error('Error:', err.message);
  process.exit(1);
});

ws.on('close', (code, reason) => {
  console.log('Closed:', code, reason.toString());
  process.exit(1);
});

setTimeout(() => {
  console.log('Timeout');
  process.exit(1);
}, 10000);
