import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import Stripe from 'stripe';

const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'qazar-bill-'));
process.env.DATA_DIR = dir;
process.env.STRIPE_SECRET_KEY = 'sk_test_123';
process.env.STRIPE_WEBHOOK_SECRET = 'whsec_test_secret';

const { config } = await import('../config.js');
config.dataDir = dir;
const { createReadyApp } = await import('../app.js');
const { getTier } = await import('../storage/db.js');

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

test('a signed checkout completion sets the owner to pro', async () => {
  const payload = JSON.stringify({
    id: 'evt_test',
    object: 'event',
    type: 'checkout.session.completed',
    data: { object: { client_reference_id: 'logi-ink', customer: 'cus_123', metadata: { ownerId: 'logi-ink' } } },
  });
  const stripe = new Stripe(process.env.STRIPE_SECRET_KEY);
  const signature = stripe.webhooks.generateTestHeaderString({
    payload,
    secret: process.env.STRIPE_WEBHOOK_SECRET,
  });
  const res = await fetch(`${base}/api/billing/webhook`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', 'stripe-signature': signature },
    body: payload,
  });
  assert.equal(res.status, 200);
  assert.equal(await getTier('logi-ink'), 'pro');
});
