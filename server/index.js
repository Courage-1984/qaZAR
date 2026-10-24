import express from 'express';
import cors from 'cors';
import path from 'node:path';
import { config, runsDir } from './config.js';
import { loadAll, listRuns } from './storage/runStore.js';
import { runsRouter } from './routes/runs.js';
import { closeBrowser } from './engine/capturePage.js';

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

const server = app.listen(config.port, () =>
  console.log(`qaZAR API listening on http://localhost:${config.port}`)
);

async function shutdown(signal) {
  console.log(`Received ${signal}, closing server and browser...`);
  server.close(async () => {
    await closeBrowser();
    process.exit(0);
  });
}

process.on('SIGINT', () => shutdown('SIGINT'));
process.on('SIGTERM', () => shutdown('SIGTERM'));
