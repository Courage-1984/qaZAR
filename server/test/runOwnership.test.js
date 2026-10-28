import test from 'node:test';
import assert from 'node:assert/strict';
import { filterRunsByOwner, runVisibleToOwner, sortRunsNewestFirst } from '../storage/runOwnership.js';

test('runVisibleToOwner allows operator scope and matching owner', () => {
  assert.equal(runVisibleToOwner(null, 'a'), false);
  assert.equal(runVisibleToOwner({ ownerId: 'a' }, null), true);
  assert.equal(runVisibleToOwner({ ownerId: 'a' }, 'a'), true);
  assert.equal(runVisibleToOwner({ ownerId: 'a' }, 'b'), false);
});

test('filterRunsByOwner and sortRunsNewestFirst', () => {
  const runs = [
    { ownerId: 'a', createdAt: '2024-01-01T00:00:00.000Z' },
    { ownerId: 'b', createdAt: '2024-02-01T00:00:00.000Z' },
    { ownerId: 'a', createdAt: '2024-03-01T00:00:00.000Z' },
  ];
  assert.equal(filterRunsByOwner(runs, 'a').length, 2);
  assert.equal(sortRunsNewestFirst(runs)[0].createdAt, '2024-03-01T00:00:00.000Z');
});
