import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';

const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'qazar-quota-'));
process.env.DATA_DIR = dir;
process.env.QAZAR_API_KEYS = 'op.operator-secret-value.operator,pub.public-secret-value.logi-ink';
process.env.ALLOW_PRIVATE = '1';

const { config } = await import('../config.js');
config.dataDir = dir;
config.allowPrivate = true;
const { createReadyApp } = await import('../app.js');

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

async function post(key, domain) {
  const res = await fetch(`${base}/api/runs`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', ...(key ? { Authorization: `Bearer ${key}` } : {}) },
    body: JSON.stringify({ domain }),
  });
  return { status: res.status, json: await res.json().catch(() => ({})) };
}

test('a free key cannot start a second in-flight run', async () => {
  assert.equal((await post('public-secret-value', 'http://127.0.0.1')).status, 202);
  const second = await post('public-secret-value', 'http://127.0.0.2');
  assert.equal(second.status, 429);
});

test('the Pages console and the operator are not capped', async () => {
  assert.equal((await post('', 'http://127.0.0.1')).status, 202);
  assert.equal((await post('', 'http://127.0.0.1')).status, 202);
  assert.equal((await post('operator-secret-value', 'http://127.0.0.1')).status, 202);
  assert.equal((await post('operator-secret-value', 'http://127.0.0.1')).status, 202);
});
