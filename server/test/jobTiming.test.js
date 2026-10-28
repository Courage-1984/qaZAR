import test from 'node:test';
import assert from 'node:assert/strict';
import {
  LEASE_EXPIRED_ERROR,
  availableAt,
  canCancelRunStatus,
  expiredLeaseDecision,
  foldJobCounts,
  leaseUntil,
} from '../queue/jobTiming.js';

test('leaseUntil and availableAt add durations to now', () => {
  assert.equal(leaseUntil(1000, 60_000), 61_000);
  assert.equal(availableAt(1000, 500), 1500);
  assert.equal(availableAt(1000), 1000);
});

test('foldJobCounts and expiredLeaseDecision pin reclaim behaviour', () => {
  assert.deepEqual(foldJobCounts([
    { status: 'queued', n: 2 },
    { status: 'leased', n: 1 },
    { status: 'done', n: 9 },
  ]), { queued: 2, leased: 1, done: 9 });
  assert.deepEqual(expiredLeaseDecision(0), { attempts: 1, dead: false });
  assert.deepEqual(expiredLeaseDecision(2), { attempts: 3, dead: true });
  assert.equal(LEASE_EXPIRED_ERROR, 'lease expired');
  assert.equal(canCancelRunStatus('capturing'), true);
  assert.equal(canCancelRunStatus('done'), false);
  assert.equal(canCancelRunStatus('failed'), false);
});
