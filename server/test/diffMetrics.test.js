import test from 'node:test';
import assert from 'node:assert/strict';
import {
  SIZE_JITTER,
  captureDiffStatus,
  diffPercent,
  dimensionShifted,
  sizeChanged,
} from '../visual/diffMetrics.js';

test('dimensionShifted ignores sub-2% jitter and flags larger shifts', () => {
  assert.equal(SIZE_JITTER, 0.02);
  assert.equal(dimensionShifted(100, 101), false); // 1%
  assert.equal(dimensionShifted(100, 102), false); // exactly 2% is not >
  assert.equal(dimensionShifted(100, 103), true);
  assert.equal(dimensionShifted(0, 10), false);
});

test('sizeChanged checks width or height', () => {
  assert.equal(sizeChanged({ width: 100, height: 100 }, { width: 100, height: 101 }), false);
  assert.equal(sizeChanged({ width: 100, height: 100 }, { width: 100, height: 120 }), true);
  assert.equal(sizeChanged({ width: 100, height: 100 }, { width: 130, height: 100 }), true);
});

test('diffPercent and captureDiffStatus match viewport thresholds', () => {
  assert.equal(diffPercent(0, 10, 10), 0);
  assert.equal(diffPercent(1, 10, 10), 1);
  assert.equal(diffPercent(5, 0, 0), 0);
  assert.equal(captureDiffStatus(0.05, false, 0.1), 'unchanged');
  assert.equal(captureDiffStatus(0.1, false, 0.1), 'changed');
  assert.equal(captureDiffStatus(0, true, 0.1), 'changed');
});
