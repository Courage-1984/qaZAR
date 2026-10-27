import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';

const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'qazar-base-'));
process.env.DATA_DIR = dir;

const { config } = await import('../config.js');
config.dataDir = dir;
const { ownerSeg, siteHash, storage } = await import('../storage/storageAdapter.js');
const { touchBaseline, listBaselineMeta, deleteBaselineMeta, awaitDb } = await import('../storage/db.js');
const { isBlockedHost } = await import('../engine/navGuard.js');

await awaitDb();

test('baselines for two owners do not share a directory', () => {
  const domain = 'https://example.com';
  const a = storage.getBaselinePath(domain, 'home', 'desktop', 'logi-ink');
  const b = storage.getBaselinePath(domain, 'home', 'desktop', 'other');
  assert.notEqual(a, b);
  assert.ok(a.includes(path.join(ownerSeg('logi-ink'), siteHash(domain))));
  assert.ok(b.includes(path.join(ownerSeg('other'), siteHash(domain))));
});

test('baseline_meta is keyed by owner and site', async () => {
  const hash = siteHash('https://example.com');
  await touchBaseline(hash, 'logi-ink', 1000);
  await touchBaseline(hash, 'other', 2000);
  const rows = await listBaselineMeta();
  const ours = rows.filter((r) => r.site_hash === hash);
  assert.equal(ours.length, 2);
  await deleteBaselineMeta('logi-ink', hash);
  const left = (await listBaselineMeta()).filter((r) => r.site_hash === hash);
  assert.equal(left.length, 1);
  assert.equal(left[0].owner_id, 'other');
});

test('nav guard blocks literal private and metadata hosts', () => {
  assert.equal(isBlockedHost('127.0.0.1'), true);
  assert.equal(isBlockedHost('169.254.169.254'), true);
  assert.equal(isBlockedHost('metadata.google.internal'), true);
  assert.equal(isBlockedHost('example.com'), false);
  assert.equal(isBlockedHost('1.1.1.1'), false);
});
