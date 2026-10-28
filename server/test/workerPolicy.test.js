import test from 'node:test';
import assert from 'node:assert/strict';
import {
  EMAIL_BACKOFF_MS,
  emailRetryDelayMs,
  heartbeatIntervalMs,
  isDeadEmailAttempt,
  maxConcurrentRuns,
  nextEmailAttempt,
  workerIdleMs,
  workerLeaseMs,
} from '../queue/workerPolicy.js';
import {
  formatSseData, listRunSummary, newRunRecord, runEventPayload,
} from '../storage/runRecord.js';

test('worker lease idle and email backoff pin defaults', () => {
  assert.equal(workerLeaseMs({}), 60_000);
  assert.equal(workerIdleMs({}), 400);
  assert.equal(heartbeatIntervalMs(60_000), 15_000);
  assert.equal(heartbeatIntervalMs(8_000), 5_000);
  assert.deepEqual(EMAIL_BACKOFF_MS, [60_000, 300_000, 900_000]);
  assert.equal(nextEmailAttempt(0), 1);
  assert.equal(isDeadEmailAttempt(3), true);
  assert.equal(isDeadEmailAttempt(2), false);
  assert.equal(emailRetryDelayMs(0), 60_000);
  assert.equal(emailRetryDelayMs(9), 900_000);
});

test('maxConcurrentRuns defaults to 2 and caps at 16', () => {
  assert.equal(maxConcurrentRuns({}), 2);
  assert.equal(maxConcurrentRuns({ MAX_CONCURRENT_RUNS: '4' }), 4);
  assert.equal(maxConcurrentRuns({ MAX_CONCURRENT_RUNS: '0' }), 2);
  assert.equal(maxConcurrentRuns({ MAX_CONCURRENT_RUNS: '99' }), 16);
});

test('newRunRecord and list/SSE helpers', () => {
  const run = newRunRecord({ domain: 'https://x.com' }, {
    ownerId: 'partner',
    now: () => '2024-01-01T00:00:00.000Z',
  });
  assert.equal(run.status, 'queued');
  assert.equal(run.ownerId, 'partner');
  assert.equal(run.createdAt, '2024-01-01T00:00:00.000Z');
  assert.ok(run.id);
  assert.ok(run.shareToken);
  assert.equal(listRunSummary({ ...run, pages: [{ url: 'x' }] }).pages, undefined);
  assert.deepEqual(runEventPayload(run), {
    status: 'queued', progress: run.progress, summary: null,
  });
  assert.equal(formatSseData({ a: 1 }), 'data: {"a":1}\n\n');
});
