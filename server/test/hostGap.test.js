import test from 'node:test';
import assert from 'node:assert/strict';
import { boundedGapSec, gapWaitMs } from '../crawler/hostGap.js';

test('boundedGapSec clamps between floor and cap', () => {
  assert.equal(boundedGapSec(2, 0, 10), 2);
  assert.equal(boundedGapSec(100, 0, 10), 10);
  assert.equal(boundedGapSec(0, 1, 10), 1);
  assert.equal(boundedGapSec(null, 0, 10), 0);
  assert.equal(boundedGapSec('3.5', 0, 10), 3.5);
});

test('gapWaitMs is zero for the first fetch and otherwise residual gap', () => {
  assert.equal(gapWaitMs(0, 1000, 2000), 0);
  assert.equal(gapWaitMs(1000, 1000, 2000), 2000);
  assert.equal(gapWaitMs(1000, 2500, 2000), 500);
  assert.equal(gapWaitMs(1000, 4000, 2000), 0);
});
