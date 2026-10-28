import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';

const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'qazar-recover-'));
process.env.DATA_DIR = dir;
const { config } = await import('../config.js');
config.dataDir = dir;
const { getDb } = await import('../storage/sqliteDb.js');
const { recoverStuckRuns } = await import('../queue/recoverStuck.js');
const { SERVER_RESTARTED_NOTE } = await import('../queue/jobTiming.js');

test('recoverStuckRuns requeues crawling runs and ensures an audit job', () => {
  const database = getDb();
  const run = {
    id: 'run-stuck',
    ownerId: 'logi-ink',
    shareToken: 'share-stuck',
    status: 'crawling',
    input: { domain: 'https://shop.example' },
    progress: { pagesDone: 0, pagesTotal: 1 },
    pages: [],
    summary: null,
    error: null,
  };
  database.prepare(`
    INSERT INTO runs (id, owner_id, share_token, status, payload)
    VALUES (?, ?, ?, ?, ?)
  `).run(run.id, run.ownerId, run.shareToken, run.status, JSON.stringify(run));

  const result = recoverStuckRuns(1_700_000_000_000);
  assert.equal(result.recovered, 1);
  assert.equal(result.enqueued, 1);

  const row = database.prepare('SELECT status, payload FROM runs WHERE id = ?').get(run.id);
  assert.equal(row.status, 'queued');
  const payload = JSON.parse(row.payload);
  assert.equal(payload.status, 'queued');
  assert.equal(payload.crawlMessage, SERVER_RESTARTED_NOTE);
  assert.equal(payload.error, null);

  const jobs = database.prepare(
    `SELECT status, kind FROM jobs WHERE run_id = ?`,
  ).all(run.id);
  assert.equal(jobs.length, 1);
  assert.equal(jobs[0].kind, 'audit');
  assert.equal(jobs[0].status, 'queued');
});

test('recoverStuckRuns does not duplicate an open audit job', () => {
  const database = getDb();
  const run = {
    id: 'run-open',
    ownerId: 'logi-ink',
    shareToken: 'share-open',
    status: 'capturing',
    input: { domain: 'https://a.example' },
    progress: { pagesDone: 0, pagesTotal: 1 },
    pages: [],
    summary: null,
    error: null,
  };
  database.prepare(`
    INSERT INTO runs (id, owner_id, share_token, status, payload)
    VALUES (?, ?, ?, ?, ?)
  `).run(run.id, run.ownerId, run.shareToken, run.status, JSON.stringify(run));
  database.prepare(`
    INSERT INTO jobs (id, run_id, kind, status, available_at, lease_until, attempts)
    VALUES ('job-open', ?, 'audit', 'queued', 0, NULL, 0)
  `).run(run.id);

  const result = recoverStuckRuns();
  assert.equal(result.recovered, 1);
  assert.equal(result.enqueued, 0);
  const n = database.prepare(`SELECT COUNT(*) AS n FROM jobs WHERE run_id = ?`).get(run.id).n;
  assert.equal(n, 1);
});
