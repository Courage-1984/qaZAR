import test from 'node:test';
import assert from 'node:assert/strict';
import { LIMIT_CAPS, getsOnly, postsOnly } from '../http/rateLimits.js';
import { healthPayload } from '../http/healthPayload.js';

test('LIMIT_CAPS pin post/share/read windows', () => {
  assert.deepEqual(LIMIT_CAPS.postByIp, { windowMs: 900_000, max: 10 });
  assert.deepEqual(LIMIT_CAPS.postByKey, { windowMs: 900_000, max: 30 });
  assert.deepEqual(LIMIT_CAPS.shareByIp, { windowMs: 60_000, max: 60 });
  assert.deepEqual(LIMIT_CAPS.billingByKey, { windowMs: 900_000, max: 20 });
  assert.deepEqual(LIMIT_CAPS.readByIp, { windowMs: 60_000, max: 120 });
});

test('postsOnly and getsOnly skip the right methods', () => {
  assert.equal(postsOnly({ method: 'GET' }), true);
  assert.equal(postsOnly({ method: 'POST' }), false);
  assert.equal(getsOnly({ method: 'POST' }), true);
  assert.equal(getsOnly({ method: 'GET' }), false);
});

test('healthPayload always reports ok qaZAR shape', () => {
  const body = healthPayload({
    activeRuns: 2, db: 'postgres', storage: 's3', uptimeSec: 9, memoryMb: 40,
  });
  assert.deepEqual(body, {
    ok: true,
    name: 'qaZAR',
    version: '0.1.0',
    uptimeSec: 9,
    memoryMb: 40,
    activeRuns: 2,
    db: 'postgres',
    storage: 's3',
  });
});
