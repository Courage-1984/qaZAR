import test from 'node:test';
import assert from 'node:assert/strict';
import {
  DAY, baselineRetentionDays, shouldPruneBaseline,
} from '../quota/baselineRetention.js';

test('baselineRetentionDays matches free/pro quota windows', () => {
  assert.equal(baselineRetentionDays('free'), 14);
  assert.equal(baselineRetentionDays('pro'), 365);
  assert.equal(baselineRetentionDays('unknown'), 14);
});

test('shouldPruneBaseline never drops operator rows', () => {
  const now = 1_000_000_000_000;
  assert.equal(shouldPruneBaseline({
    ownerId: 'operator', tier: 'free', updatedAt: 0, now,
  }), false);
});

test('shouldPruneBaseline respects free and pro age thresholds', () => {
  const now = 1_000_000_000_000;
  assert.equal(shouldPruneBaseline({
    ownerId: 'a', tier: 'free', updatedAt: now - (14 * DAY) + 1, now,
  }), false);
  assert.equal(shouldPruneBaseline({
    ownerId: 'a', tier: 'free', updatedAt: now - (14 * DAY), now,
  }), true);
  assert.equal(shouldPruneBaseline({
    ownerId: 'b', tier: 'pro', updatedAt: now - (365 * DAY) + 1, now,
  }), false);
  assert.equal(shouldPruneBaseline({
    ownerId: 'b', tier: 'pro', updatedAt: now - (365 * DAY), now,
  }), true);
});
