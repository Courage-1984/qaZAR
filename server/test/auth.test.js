import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';

const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'qazar-auth-'));
process.env.DATA_DIR = dir;
process.env.QAZAR_API_KEYS = 'op.operator-secret-value.operator,pub.public-secret-value.logi-ink';
process.env.QAZAR_OPERATOR_KEY = 'operator-session-key';
process.env.ALLOW_PRIVATE = '1';

const { config } = await import('../config.js');
config.dataDir = dir;
config.allowPrivate = true;

const { createReadyApp } = await import('../app.js');
const { storage } = await import('../storage/storageAdapter.js');

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

async function post(key, body) {
  const res = await fetch(`${base}/api/runs`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', ...(key ? { Authorization: `Bearer ${key}` } : {}) },
    body: JSON.stringify(body),
  });
  const json = await res.json().catch(() => ({}));
  return { status: res.status, json };
}

test('a bad key is rejected', async () => {
  const res = await post('nope', { domain: 'http://127.0.0.1' });
  assert.equal(res.status, 401);
});

test('health has no tunnel field', async () => {
  const body = await fetch(`${base}/healthz`).then((r) => r.json());
  assert.equal(body.ok, true);
  assert.equal('tunnel' in body, false);
});

test('body ownerId is ignored and a public key cannot widen the crawl', async () => {
  const res = await post('public-secret-value', {
    domain: 'http://127.0.0.1',
    ownerId: 'hacker',
    max_pages: 50,
    renderJs: true,
    pages: ['/admin'],
  });
  assert.equal(res.status, 202);
  const run = await fetch(`${base}/api/runs/${res.json.runId}`, {
    headers: { Authorization: 'Bearer public-secret-value' },
  }).then((r) => r.json());
  assert.equal(run.ownerId, 'logi-ink');
  assert.equal(run.input.max_pages, 5);
  assert.equal(run.input.renderJs, false);
  assert.equal(run.input.pages, null);
  const { getRun, save } = await import('../storage/runStore.js');
  const stored = await getRun(res.json.runId);
  stored.status = 'done';
  await save(stored);
});

test('share payload hides contacts and another owner cannot read artefacts', async () => {
  const res = await post('public-secret-value', { domain: 'http://127.0.0.1' });
  const { getRun, save } = await import('../storage/runStore.js');
  const run = await getRun(res.json.runId);
  run.siteProfile = { leadContacts: { emails: ['hidden@example.com'] } };
  run.status = 'done';
  run.summary = { changed: 0 };
  await save(run);
  storage.writeArtifact(run.id, 'shots/home/desktop.png', 'png');
  storage.writeArtifact(run.id, 'run.json', JSON.stringify(run));
  const share = await fetch(`${base}/api/share/${run.shareToken}`).then((r) => r.json());
  assert.equal(share.status, 'done');
  assert.equal(JSON.stringify(share).includes('hidden@example.com'), false);
  assert.equal(JSON.stringify(share).includes('leadContacts'), false);
  const denied = await fetch(`${base}/api/artifacts/${run.id}/shots/home/desktop.png`, {
    headers: { Authorization: 'Bearer operator-secret-value' },
  });
  assert.equal(denied.status, 404);
  const open = await fetch(`${base}/api/artifacts/${run.id}/shots/home/desktop.png`);
  assert.equal(open.status, 200);
  const secret = await fetch(`${base}/api/artifacts/${run.id}/run.json`);
  assert.equal(secret.status, 404);
});

test('GitHub Pages can create a run without a key', async () => {
  const res = await post('', { domain: 'http://127.0.0.1', max_pages: 3 });
  assert.equal(res.status, 202);
  assert.ok(res.json.runId);
  assert.ok(res.json.shareToken);
});
