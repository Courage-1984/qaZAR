import express from 'express';
import cors from 'cors';
import path from 'node:path';
import { config, runsDir } from './config.js';
import { loadAll, listRuns } from './storage/runStore.js';
import { runsRouter } from './routes/runs.js';
import { closeBrowser } from './engine/capturePage.js';
import { ensurePortFree } from './freePort.js';

loadAll();
const app = express();
app.use(cors());
app.use(express.json());

const healthHandler = (_req, res) => {
  const mem = process.memoryUsage();
  res.json({
    ok: true,
    name: 'qaZAR',
    version: '0.1.0',
    uptimeSec: Math.round(process.uptime()),
    memoryMb: Math.round(mem.rss / 1024 / 1024),
    activeRuns: listRuns().filter((r) => ['queued', 'crawling', 'capturing'].includes(r.status)).length,
  });
};

app.get('/healthz', healthHandler);
app.get('/api/health', healthHandler);

app.use('/api/runs', runsRouter);
app.use('/api/artifacts', express.static(path.resolve(runsDir())));

// Error handling middleware
app.use((err, _req, res, _next) => {
  console.error('[qaZAR Server Error]:', err);
  res.status(err.status || 500).json({ error: err.message || 'Internal Server Error' });
});

import fs from 'node:fs';
import os from 'node:os';
import { startPublicTunnel } from './tunnel.js';

const webDist = path.resolve('web/dist');
const webDir = path.resolve('web');
app.use(express.static(fs.existsSync(webDist) ? webDist : webDir));

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
const server = app.listen(config.port, host, async () => {
  const localIp = getLocalIp();
  console.log(`qaZAR API listening on http://localhost:${config.port}`);
  if (localIp) {
    console.log(`qaZAR Mobile/LAN access: http://${localIp}:${config.port}`);
  }
  if (config.tunnel) {
    console.log('[qaZAR Tunnel] Starting public Cloudflare HTTPS tunnel...');
    const t = await startPublicTunnel(config.port);
    if (t?.url) {
      console.log(`\n================================================================`);
      console.log(`qaZAR Public HTTPS (Mobile & Outside Network): ${t.url}`);
      console.log(`Direct Mobile Access: ${t.url}`);
      console.log(`GitHub Pages Auto-Link: https://courage-1984.github.io/qaZAR/?api=${encodeURIComponent(t.url)}`);
      console.log(`================================================================\n`);
    }
  }
});

async function shutdown(signal) {
  console.log(`Received ${signal}, closing server and browser...`);
  server.close(async () => {
    await closeBrowser();
    process.exit(0);
  });
}

process.on('SIGINT', () => shutdown('SIGINT'));
process.on('SIGTERM', () => shutdown('SIGTERM'));
