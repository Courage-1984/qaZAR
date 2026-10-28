import test from 'node:test';
import assert from 'node:assert/strict';
import {
  countByStatus, findingKey, reviewFindings, triageViolation,
} from '../report/findingReview.js';

test('info and indeterminate rules triage to needs-review', () => {
  assert.equal(triageViolation({ rule: 'wcag-contrast', severity: 'error' }), 'retained');
  assert.equal(triageViolation({ rule: 'wcag-contrast-indeterminate', severity: 'info' }), 'needs-review');
  assert.equal(triageViolation({ rule: 'body-font-size', severity: 'info' }), 'needs-review');
  assert.equal(triageViolation(null), 'needs-review');
});

test('findingKey prefers slug and includes selector', () => {
  assert.equal(
    findingKey({ slug: 'home', url: 'https://x/' }, 'mobile', { rule: 'h-overflow', selector: 'body' }),
    'home|mobile|h-overflow|body',
  );
  assert.equal(
    findingKey({ url: 'https://x/' }, 'desktop', { rule: 'x' }),
    'https://x/|desktop|x|',
  );
});

test('countByStatus tallies retained withdrawn and needs-review', () => {
  assert.deepEqual(countByStatus([
    { status: 'retained' },
    { status: 'needs-review' },
    { status: 'withdrawn' },
    { status: 'retained' },
  ]), { retained: 2, withdrawn: 1, needsReview: 1 });
});

test('reviewFindings counts retained needs-review and withdrawn overrides', () => {
  const run = {
    pages: [{
      url: 'https://example.com/',
      slug: 'home',
      viewports: {
        mobile: {
          violations: [
            { rule: 'h-overflow', severity: 'error', selector: 'body', detail: 'x' },
            { rule: 'body-font-size', severity: 'info', selector: 'p', detail: 'y' },
          ],
        },
      },
    }],
  };
  const base = reviewFindings(run);
  assert.equal(base.counts.retained, 1);
  assert.equal(base.counts.needsReview, 1);
  assert.equal(base.counts.withdrawn, 0);
  const key = base.findings[0].key;
  const overridden = reviewFindings(run, { [key]: 'withdrawn' });
  assert.equal(overridden.counts.withdrawn, 1);
});
