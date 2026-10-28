import express from 'express';
import cors from 'cors';
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
import { originAllowed } from './util/originAllowed.js';
import { createApiLimiters } from './http/rateLimits.js';
import { healthPayload } from './http/healthPayload.js';
import { discoveryResponse } from './tunnelArgs.js';

const { postByIp, postByKey, shareByIp, billingByKey, readByIp } = createApiLimiters();

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
    res.json(healthPayload({
      activeRuns: await countActiveRuns(),
      db: dbDriver,
      storage: config.storageDriver,
    }));
  };
  app.get('/healthz', health);
  app.get('/api/health', health);
  app.get('/api/discovery', (_req, res) => res.json(discoveryResponse({
    localIp: getLocalIp(),
    port: config.port,
  })));
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
