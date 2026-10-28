import test from 'node:test';
import assert from 'node:assert/strict';
import { timingSafeEqual } from '../util/timingSafeEqual.js';
import { HttpError, httpError } from '../util/httpError.js';
import { createThrottledWriter } from '../util/throttle.js';
import { getLocalIp } from '../util/localIp.js';
import { loadApiKeys } from '../auth/apiKey.js';

test('timingSafeEqual rejects length mismatch and empty', () => {
  assert.equal(timingSafeEqual('abc', 'abc'), true);
  assert.equal(timingSafeEqual('abc', 'abd'), false);
  assert.equal(timingSafeEqual('ab', 'abc'), false);
  assert.equal(timingSafeEqual('', ''), false);
});

test('HttpError carries status', () => {
  const err = httpError(429, 'slow down');
  assert.ok(err instanceof HttpError);
  assert.equal(err.status, 429);
  assert.equal(err.message, 'slow down');
});

test('createThrottledWriter coalesces and drain awaits chain', async () => {
  let n = 0;
  const writer = createThrottledWriter(async () => { n += 1; }, 50);
  writer.schedule();
  writer.schedule();
  writer.schedule();
  await new Promise((r) => setTimeout(r, 80));
  assert.equal(n, 1);
  await writer.drain();
  assert.equal(n, 1);
});

test('getLocalIp returns string or null', () => {
  const ip = getLocalIp();
  assert.ok(ip === null || typeof ip === 'string');
});

test('loadApiKeys caches identical raw input', () => {
  const raw = 'a.secret-one.owner,b.secret-two.other';
  const first = loadApiKeys(raw);
  const second = loadApiKeys(raw);
  assert.equal(first, second);
  assert.equal(first.length, 2);
  assert.notEqual(loadApiKeys('a.secret-one.owner'), first);
});
