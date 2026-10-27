import test from 'node:test';
import assert from 'node:assert/strict';
import { drainWaves, mapPool } from '../util/batch.js';

const wait = (ms) => new Promise((resolve) => setTimeout(resolve, ms));

test('mapPool never runs more than the concurrency', async () => {
  let inflight = 0;
  let max = 0;
  const seen = [];
  await mapPool([1, 2, 3, 4, 5], 2, async (n) => {
    inflight += 1;
    max = Math.max(max, inflight);
    await wait(15);
    seen.push(n);
    inflight -= 1;
  });
  assert.equal(max, 2);
  assert.deepEqual(seen.sort((a, b) => a - b), [1, 2, 3, 4, 5]);
});

test('drainWaves defers links found during a wave until the next wave', async () => {
  const queue = ['a'];
  const events = [];
  let inflight = 0;
  let max = 0;
  await drainWaves(queue, 2, async (url) => {
    inflight += 1;
    max = Math.max(max, inflight);
    events.push(`start:${url}`);
    await wait(20);
    if (url === 'a') queue.push('b', 'c');
    events.push(`end:${url}`);
    inflight -= 1;
  });
  assert.ok(max <= 2);
  assert.ok(events.indexOf('end:a') < events.indexOf('start:b'));
  assert.ok(events.indexOf('end:a') < events.indexOf('start:c'));
  assert.deepEqual(
    events.filter((e) => e.startsWith('start:')).sort(),
    ['start:a', 'start:b', 'start:c'],
  );
});
