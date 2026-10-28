import test from 'node:test';
import assert from 'node:assert/strict';
import { clusterAdjustment, depthAdjustment } from '../crawler/roiDepth.js';

test('depthAdjustment rewards shallow paths and penalizes deep ones', () => {
  assert.deepEqual(depthAdjustment(0), { delta: 50, labels: ['root'] });
  assert.deepEqual(depthAdjustment(1), { delta: 20, labels: [] });
  assert.deepEqual(depthAdjustment(2), { delta: 10, labels: [] });
  assert.deepEqual(depthAdjustment(3), { delta: 0, labels: [] });
  assert.deepEqual(depthAdjustment(4), { delta: 0, labels: [] });
  assert.deepEqual(depthAdjustment(5), { delta: -10, labels: ['deep-path'] });
  assert.deepEqual(depthAdjustment(6), { delta: -20, labels: ['deep-path'] });
});

test('clusterAdjustment scales with prior prefix count', () => {
  assert.deepEqual(clusterAdjustment(0, 'blog'), { delta: 0, labels: [] });
  assert.deepEqual(clusterAdjustment(1, 'blog'), { delta: -15, labels: ['cluster-blog'] });
  assert.deepEqual(clusterAdjustment(3, 'news'), { delta: -45, labels: ['cluster-news'] });
});
