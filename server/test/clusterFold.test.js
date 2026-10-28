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
  assert.equal(clusters[0].componentFailures, 1);
  assert.equal(clusters[0].viewportHits, 2);
  assert.deepEqual(clusters[0].viewports.sort(), ['desktop', 'mobile']);
  assert.match(clusters[0].observed, /1 component failure/);
  assert.match(clusters[0].title, /Horizontal overflow/i);
});

test('seven viewport hits for one selector still count as one component failure', () => {
  const map = new Map();
  for (const vp of ['ultrawide', 'fhd', 'macbook', 'desktop', 'laptop', 'tablet', 'mobile']) {
    observeViolation(map, {
      rule: 'wcag-contrast', severity: 'error', selector: 'button.cta', detail: '2:1',
    }, 'https://ex.com/', vp);
  }
  const [cluster] = materializeClusters(map, 1);
  assert.equal(cluster.componentFailures, 1);
  assert.equal(cluster.totalOccurrences, 7);
  assert.equal(cluster.viewportHits, 7);
});
