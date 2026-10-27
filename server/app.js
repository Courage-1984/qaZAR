import express from 'express';
import cors from 'cors';
import rateLimit, { ipKeyGenerator } from 'express-rate-limit';
import path from 'node:path';
import fs from 'node:fs';
import { config } from './config.js';
import { countActiveRuns, loadAll } from './storage/runStore.js';
import { awaitDb, dbDriver } from './storage/db.js';
import { runsRouter } from './routes/runs.js';
import { shareRouter } from './routes/share.js';
import { artifactHandler } from './routes/artifacts.js';
import { attachAuth, operatorToken, setOperatorCookie } from './auth/apiKey.js';
import { accountHandler, checkoutHandler, webhookHandler } from './billing/stripeBilling.js';
import { timingSafeEqual } from './util/timingSafeEqual.js';
import { getLocalIp } from './util/localIp.js';

function originAllowed(origin) {
  if (!origin) return true;
  let host = '';
  try { host = new URL(origin).hostname; } catch { return false; }
  if (host === 'localhost' || host === '127.0.0.1' || host.endsWith('github.io')) return true;
  if (host === 'logi-ink.co.za' || host.endsWith('.logi-ink.co.za')) return true;
  return config.allowedOrigins.includes(origin);
}

const ipOf = (req) => ipKeyGenerator(req.ip || '127.0.0.1');
const postsOnly = (req) => req.method !== 'POST';

function limit({ windowMs, max, keyGenerator, skip }) {
  return rateLimit({
    windowMs,
    limit: max,
    standardHeaders: true,
    legacyHeaders: false,
    keyGenerator,
    ...(skip ? { skip } : {}),
  });
}

const postByIp = limit({ windowMs: 15 * 60 * 1000, max: 10, keyGenerator: ipOf, skip: postsOnly });
const postByKey = limit({
  windowMs: 15 * 60 * 1000,
  max: 30,
  keyGenerator: (req) => req.auth?.keyId || ipOf(req),
  skip: postsOnly,
});
const shareByIp = limit({ windowMs: 60 * 1000, max: 60, keyGenerator: ipOf });
const billingByKey = limit({
  windowMs: 15 * 60 * 1000,
  max: 20,
  keyGenerator: (req) => req.auth?.keyId || ipOf(req),
});
const readByIp = limit({
  windowMs: 60 * 1000,
  max: 120,
  keyGenerator: ipOf,
  skip: (req) => req.method !== 'GET',
});

export function createApp() {
  const app = express();
  app.set('trust proxy', 1);
  app.use(cors({ origin: (origin, cb) => cb(null, originAllowed(origin)) }));
  app.post('/api/billing/webhook', express.raw({ type: 'application/json' }), webhookHandler);
  app.use(express.json({ limit: '16kb' }));
  app.use('/api', (_req, res, next) => {
    res.set('Cache-Control', 'no-store');
    next();
  });

  const health = async (_req, res) => {
    const mem = process.memoryUsage();
    res.json({
      ok: true,
      name: 'qaZAR',
      version: '0.1.0',
      uptimeSec: Math.round(process.uptime()),
      memoryMb: Math.round(mem.rss / 1024 / 1024),
      activeRuns: await countActiveRuns(),
      db: dbDriver,
      storage: config.storageDriver,
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
    if (!expected || !timingSafeEqual(left, right)) {
      return res.status(401).json({ error: 'Unauthorized' });
    }
    setOperatorCookie(req, res);
    res.json({ ok: true });
  });

  app.get('/api/billing/account', attachAuth, accountHandler);
  app.post('/api/billing/checkout', attachAuth, billingByKey, checkoutHandler);
  app.use('/api/runs', attachAuth, readByIp, postByIp, postByKey, runsRouter);
  app.use('/api/share', shareByIp, shareRouter);
  app.use('/api/artifacts', attachAuth, readByIp, artifactHandler);

  const webDist = path.resolve('web/dist');
  const webDir = path.resolve('web');
  app.use(express.static(fs.existsSync(webDist) ? webDist : webDir));
  app.use((err, _req, res, _next) => {
    console.error('[qaZAR Server Error]:', err);
    res.status(err.status || 500).json({ error: err.message || 'Internal Server Error' });
  });
  return app;
}

/** Ready app with DB schema loaded (required before listen in tests and index). */
export async function createReadyApp() {
  await awaitDb();
  await loadAll();
  return createApp();
}
