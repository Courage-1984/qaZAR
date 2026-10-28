import test from 'node:test';
import assert from 'node:assert/strict';
import { healthMetricsFromClusters } from '../report/healthMetrics.js';

test('healthMetricsFromClusters tallies errors warns and categories', () => {
  const coverage = { completed: 4, attempted: 5, failed: 1, line: '4/5' };
  const clusters = [
    { severity: 'error', rule: 'overflow-x', totalOccurrences: 3 },
    { severity: 'warn', rule: 'target-size-minimum', totalOccurrences: 2 },
    { severity: 'info', rule: 'contrast-indeterminate', totalOccurrences: 9 },
  ];
  const { metrics, categories } = healthMetricsFromClusters(clusters, coverage, 2);
  assert.equal(metrics.totalPages, 2);
  assert.equal(metrics.totalCaptures, 4);
  assert.equal(metrics.failedCaptures, 1);
  assert.equal(metrics.distinctErrors, 1);
  assert.equal(metrics.distinctWarnings, 1);
  assert.equal(metrics.rawErrors, 3);
  assert.equal(metrics.rawWarnings, 2);
  assert.equal(categories.overflowBreakage, 3);
  assert.equal(categories.mobileTouch, 2);
});
