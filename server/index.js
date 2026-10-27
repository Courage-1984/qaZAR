import os from 'node:os';
import { config } from './config.js';
import { createApp } from './app.js';
import { ensurePortFree } from './freePort.js';
import { startPublicTunnel, publishDiscovery } from './tunnel.js';

process.on('uncaughtException', (err) => console.error('[qaZAR uncaughtException]:', err));
process.on('unhandledRejection', (reason) => console.error('[qaZAR unhandledRejection]:', reason));

function getLocalIp() {
  try {
    const nets = os.networkInterfaces();
    for (const name of Object.keys(nets)) {
      for (const net of nets[name] || []) {
        if (net.family === 'IPv4' && !net.internal) return net.address;
      }
    }
  } catch {
    /* fallback */
  }
  return null;
}

await ensurePortFree(config.port);
const host = config.host || '0.0.0.0';
const app = createApp();
let tunnelHandle = null;

const server = app.listen(config.port, host, async () => {
  const localIp = getLocalIp();
  console.log(`qaZAR API listening on http://localhost:${config.port}`);
  console.log('Start the capture worker with: npm run worker');
  if (localIp) console.log(`qaZAR Mobile/LAN access: http://${localIp}:${config.port}`);
  if (!config.tunnel) return;
  console.log('[qaZAR Tunnel] Starting public Cloudflare HTTPS tunnel...');
  tunnelHandle = await startPublicTunnel(config.port);
  if (!tunnelHandle?.url) return;
  await publishDiscovery({
    url: tunnelHandle.url,
    lanUrl: localIp ? `http://${localIp}:${config.port}` : null,
  });
  console.log(`\n================================================================`);
  console.log(`qaZAR Public HTTPS (Mobile & Outside Network): ${tunnelHandle.url}`);
  console.log(`GitHub Pages Auto-Link: https://courage-1984.github.io/qaZAR/?api=${encodeURIComponent(tunnelHandle.url)}`);
  console.log(`================================================================\n`);
});

function shutdown(signal) {
  console.log(`Received ${signal}, closing server and tunnel...`);
  try { tunnelHandle?.proc?.kill(); } catch { /* skip */ }
  server.close(() => process.exit(0));
}

process.on('SIGINT', () => shutdown('SIGINT'));
process.on('SIGTERM', () => shutdown('SIGTERM'));
