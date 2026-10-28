import test from 'node:test';
import assert from 'node:assert/strict';
import {
  categoryBucket,
  compareClusters,
  defectClusterKey,
  emptyCategories,
  normalizeSelector,
} from '../report/defectCluster.js';
import { captureCoverage } from '../report/captureCoverage.js';

test('normalizeSelector strips nth-of-type noise', () => {
  assert.equal(normalizeSelector('div:nth-of-type(3)  >  span'), 'div > span');
  assert.equal(normalizeSelector(''), '');
});

test('defectClusterKey and categoryBucket pin report grouping', () => {
  assert.equal(
    defectClusterKey({ rule: 'overflow-x', severity: 'error', selector: 'body:nth-of-type(1)' }),
    'overflow-x::error::body',
  );
  assert.equal(categoryBucket('target-size-minimum'), 'mobileTouch');
  assert.equal(categoryBucket('h-overflow'), 'overflowBreakage');
  assert.equal(categoryBucket('wcag-contrast'), 'wcagContrast');
  assert.equal(categoryBucket('element-collision'), 'collisions');
  assert.equal(categoryBucket('other'), null);
  assert.deepEqual(emptyCategories().typography, 0);
});

test('compareClusters prefers errors then occurrence count', () => {
  const err = { severity: 'error', totalOccurrences: 1 };
  const warn = { severity: 'warn', totalOccurrences: 9 };
  assert.ok(compareClusters(err, warn) < 0);
  assert.ok(compareClusters(
    { severity: 'warn', totalOccurrences: 2 },
    { severity: 'warn', totalOccurrences: 5 },
  ) > 0);
});

test('captureCoverage skips pending and notes caps', () => {
  const cov = captureCoverage({
    input: { deterministic: true },
    pages: [{
      viewports: {
        desktop: { status: 'new', metrics: { capped: ['overflow-x'], contrastSampleCapped: true } },
        mobile: { status: 'pending' },
        tablet: { status: 'error', partial: true },
      },
    }],
  });
  assert.equal(cov.attempted, 2);
  assert.equal(cov.completed, 1);
  assert.equal(cov.failed, 1);
  assert.match(cov.line, /capped/);
  assert.match(cov.line, /partial/);
  assert.match(cov.line, /Deterministic/);
});
