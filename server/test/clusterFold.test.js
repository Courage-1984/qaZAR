import test from 'node:test';
import assert from 'node:assert/strict';
import { materializeClusters, observeViolation } from '../report/clusterFold.js';

test('observeViolation merges same rule selector across pages', () => {
  const map = new Map();
  observeViolation(map, { rule: 'overflow-x', severity: 'error', selector: 'div.a', detail: 'x' }, 'https://a/', 'desktop');
  observeViolation(map, { rule: 'overflow-x', severity: 'error', selector: 'div.a', detail: 'x' }, 'https://b/', 'mobile');
  const clusters = materializeClusters(map, 2);
  assert.equal(clusters.length, 1);
  assert.equal(clusters[0].pagesCount, 2);
  assert.equal(clusters[0].totalOccurrences, 2);
  assert.deepEqual(clusters[0].viewports.sort(), ['desktop', 'mobile']);
  assert.match(clusters[0].observed, /2 of 2/);
});
