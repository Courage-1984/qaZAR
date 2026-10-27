import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';

const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'qazar-queue-'));
process.env.DATA_DIR = dir;
const { config } = await import('../config.js');
config.dataDir = dir;
const { getDb } = await import('../storage/sqliteDb.js');
const { claim, enqueue, reclaimExpired, reclaimLeased } = await import('../queue/sqliteQueue.js');

test('two claims take different jobs', () => {
  enqueue('run-a', 'audit');
  enqueue('run-b', 'audit');
  const first = claim('w1', 60_000);
  const second = claim('w2', 60_000);
  const third = claim('w3', 60_000);
  assert.ok(first && second);
  assert.notEqual(first.id, second.id);
  assert.equal(third, null);
});

test('an expired lease is queued again until the third reclaim', () => {
  const database = getDb();
  database.prepare(`INSERT INTO jobs (id, run_id, kind, status, available_at, lease_until, attempts) VALUES ('job-lease', 'run-c', 'audit', 'leased', 0, 1, 0)`).run();
  reclaimExpired(10);
  let row = database.prepare(`SELECT status, attempts FROM jobs WHERE id = 'job-lease'`).get();
  assert.equal(row.status, 'queued');
  assert.equal(row.attempts, 1);
  database.prepare(`UPDATE jobs SET status = 'leased', lease_until = 1 WHERE id = 'job-lease'`).run();
  reclaimExpired(10);
  row = database.prepare(`SELECT status, attempts FROM jobs WHERE id = 'job-lease'`).get();
  assert.equal(row.status, 'queued');
  assert.equal(row.attempts, 2);
  database.prepare(`UPDATE jobs SET status = 'leased', lease_until = 1 WHERE id = 'job-lease'`).run();
  reclaimExpired(10);
  row = database.prepare(`SELECT status, attempts FROM jobs WHERE id = 'job-lease'`).get();
  assert.equal(row.status, 'failed');
  assert.equal(row.attempts, 3);
});

test('a fresh worker reclaims a live lease without adding an attempt', () => {
  const database = getDb();
  database.prepare(`INSERT INTO jobs (id, run_id, kind, status, available_at, lease_until, attempts) VALUES ('job-boot', 'run-d', 'audit', 'leased', 0, 9999999999999, 2)`).run();
  reclaimLeased(50);
  const row = database.prepare(`SELECT status, attempts, lease_until FROM jobs WHERE id = 'job-boot'`).get();
  assert.equal(row.status, 'queued');
  assert.equal(row.attempts, 2);
  assert.equal(row.lease_until, null);
});
