import WebSocket from 'ws';

async function testRateLimit() {
  let connections = 0;
  
  const connect = () => {
    return new Promise((resolve, reject) => {
      const ws = new WebSocket('ws://localhost:3002', {
        headers: { 'x-agent-secret': 'PhSlyr_Agent_2026!xK9#mZ' },
        perMessageDeflate: false
      });
      ws.on('open', () => {
        connections++;
        resolve(ws);
      });
      ws.on('error', (err) => {
        console.log(`[Test] WS Error at conn ${connections}:`, err.message);
        resolve(null);
      });
      ws.on('close', (code, reason) => {
        console.log(`[Test] WS Closed at conn ${connections} with code ${code}:`, reason.toString());
        resolve(null);
      });
    });
  };

  for (let i = 0; i < 15; i++) {
    await connect();
    console.log(`Connection attempt ${i + 1}`);
  }
}

testRateLimit().catch(console.error);
