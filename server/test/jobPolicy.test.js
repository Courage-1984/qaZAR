import test from 'node:test';
import assert from 'node:assert/strict';
import {
  MAX_JOB_ATTEMPTS,
  isDeadAttempt,
  jobErrorLine,
  nextAttempts,
  shouldStealLiveLeases,
} from '../queue/jobPolicy.js';

test('attempt counters pin the dead threshold at 3', () => {
  assert.equal(MAX_JOB_ATTEMPTS, 3);
  assert.equal(nextAttempts(0), 1);
  assert.equal(nextAttempts(2), 3);
  assert.equal(isDeadAttempt(2), false);
  assert.equal(isDeadAttempt(3), true);
});

test('jobErrorLine keeps the first line', () => {
  assert.equal(jobErrorLine(new Error('boom\nstack')), 'boom');
  assert.equal(jobErrorLine(null), '');
});

test('shouldStealLiveLeases only for single-worker sqlite', () => {
  assert.equal(shouldStealLiveLeases({ QAZAR_SINGLE_WORKER: '1' }, 'sqlite'), true);
  assert.equal(shouldStealLiveLeases({ QAZAR_SINGLE_WORKER: '1' }, 'postgres'), false);
  assert.equal(shouldStealLiveLeases({}, 'sqlite'), false);
  assert.equal(shouldStealLiveLeases({ QAZAR_SINGLE_WORKER: '0' }, 'sqlite'), false);
});
