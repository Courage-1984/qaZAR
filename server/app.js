import express from 'express';
import cors from 'cors';
import rateLimit, { ipKeyGenerator } from 'express-rate-limit';
import path from 'node:path';
import fs from 'node:fs';
import os from 'node:os';
import { config } from './config.js';
import { listRuns, loadAll } from './storage/runStore.js';
import { runsRouter } from './routes/runs.js';
import { shareRouter } from './routes/share.js';
import { artifactHandler } from './routes/artifacts.js';
import { attachAuth, operatorToken, setOperatorCookie } from './auth/apiKey.js';

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

function originAllowed(origin) {
  if (!origin) return true;
  let host = '';
  try { host = new URL(origin).hostname; } catch { return false; }
  if (host === 'localhost' || host === '127.0.0.1' || host.endsWith('github.io')) return true;
  return config.allowedOrigins.includes(origin);
}

const ipOf = (req) => ipKeyGenerator(req.ip || '127.0.0.1');

const postsOnly = (req) => req.method !== 'POST';

const postByIp = rateLimit({
  windowMs: 15 * 60 * 1000,
  limit: 10,
  standardHeaders: true,
  legacyHeaders: false,
  keyGenerator: ipOf,
  skip: postsOnly,
});

const postByKey = rateLimit({
  windowMs: 15 * 60 * 1000,
  limit: 30,
  standardHeaders: true,
  legacyHeaders: false,
  keyGenerator: (req) => req.auth?.keyId || ipOf(req),
  skip: postsOnly,
});

const shareByIp = rateLimit({
  windowMs: 60 * 1000,
  limit: 60,
  standardHeaders: true,
  legacyHeaders: false,
  keyGenerator: ipOf,
});

export function createApp() {
  loadAll();
  const app = express();
  app.set('trust proxy', 1);
  app.use(cors({ origin: (origin, cb) => cb(null, originAllowed(origin)) }));
  app.use(express.json({ limit: '16kb' }));
  app.use('/api', (_req, res, next) => {
    res.set('Cache-Control', 'no-store');
    next();
  });

  const health = (_req, res) => {
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
  app.get('/healthz', health);
  app.get('/api/health', health);
  app.get('/api/discovery', (_req, res) => res.json({
    localIp: getLocalIp(),
    port: config.port,
  }));
  app.post('/api/operator/session', (req, res) => {
    const supplied = String(req.body?.key || '');
    const expected = process.env.QAZAR_OPERATOR_KEY || '';
    const left = operatorToken(supplied);
    const right = operatorToken(expected);
    if (!expected || left.length !== right.length || !left || left !== right) {
      return res.status(401).json({ error: 'Unauthorized' });
    }
    setOperatorCookie(req, res);
    res.json({ ok: true });
  });

  app.use('/api/runs', attachAuth, postByIp, postByKey, runsRouter);
  app.use('/api/share', shareByIp, shareRouter);
  app.use('/api/artifacts', attachAuth, artifactHandler);

  const webDist = path.resolve('web/dist');
  const webDir = path.resolve('web');
  app.use(express.static(fs.existsSync(webDist) ? webDist : webDir));
  app.use((err, _req, res, _next) => {
    console.error('[qaZAR Server Error]:', err);
    res.status(err.status || 500).json({ error: err.message || 'Internal Server Error' });
  });
  return app;
}
