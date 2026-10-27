import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';

const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'qazar-acct-'));
process.env.DATA_DIR = dir;
process.env.QAZAR_API_KEYS = 'pub.public-secret-value.logi-ink';
process.env.STRIPE_SECRET_KEY = '';
process.env.STRIPE_PRICE_ID = '';

const { config } = await import('../config.js');
config.dataDir = dir;
const { createReadyApp } = await import('../app.js');
const { setTier } = await import('../storage/db.js');

let base;
let server;
test.before(async () => {
  const app = await createReadyApp();
  server = await new Promise((resolve) => {
    const handle = app.listen(0, '127.0.0.1', () => resolve(handle));
  });
  base = `http://127.0.0.1:${server.address().port}`;
});
test.after(async () => {
  await new Promise((resolve) => server.close(resolve));
});

test('billing account requires a bearer key', async () => {
  const res = await fetch(`${base}/api/billing/account`);
  assert.equal(res.status, 401);
});

test('billing account returns free tier quotas for a partner key', async () => {
  const res = await fetch(`${base}/api/billing/account`, {
    headers: { Authorization: 'Bearer public-secret-value' },
  });
  assert.equal(res.status, 200);
  const body = await res.json();
  assert.equal(body.ownerId, 'logi-ink');
  assert.equal(body.tier, 'free');
  assert.equal(body.pageCap, 5);
  assert.equal(body.inflight, 1);
  assert.equal(body.checkout, false);
});

test('billing account reflects a pro upgrade', async () => {
  await setTier('logi-ink', 'pro', 'cus_test');
  const res = await fetch(`${base}/api/billing/account`, {
    headers: { Authorization: 'Bearer public-secret-value' },
  });
  const body = await res.json();
  assert.equal(body.tier, 'pro');
  assert.equal(body.pageCap, 50);
  assert.equal(body.inflight, 3);
});

test('health reports db and storage drivers', async () => {
  const res = await fetch(`${base}/healthz`);
  const body = await res.json();
  assert.equal(body.ok, true);
  assert.equal(body.db, 'sqlite');
  assert.equal(body.storage, 'local');
});
