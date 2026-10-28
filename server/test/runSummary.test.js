import test from 'node:test';
import assert from 'node:assert/strict';
import {
  captureConcurrency,
  crawlConcurrency,
  emptyProgress,
  seedPages,
  summarizeRun,
} from '../queue/runSummary.js';

test('summarizeRun tallies statuses and rule counts', () => {
  const s = summarizeRun({
    pages: [{
      viewports: {
        desktop: {
          status: 'changed',
          violations: [
            { rule: 'overflow-x', severity: 'error' },
            { rule: 'wcag-contrast', severity: 'warn' },
          ],
        },
        mobile: { status: 'error', violations: [] },
        tablet: { status: 'new', violations: [{ rule: 'overflow-x', severity: 'error' }] },
      },
    }],
  });
  assert.equal(s.pages, 1);
  assert.equal(s.captures, 3);
  assert.equal(s.errors, 1);
  assert.equal(s.changed, 1);
  assert.equal(s.new, 1);
  assert.equal(s.violations.error, 2);
  assert.equal(s.violations.warn, 1);
  assert.equal(s.byRule['overflow-x'], 2);
});

test('seedPages and emptyProgress pin ROI slug and totals', () => {
  const pages = seedPages(['https://shop.example/pricing']);
  assert.equal(pages.length, 1);
  assert.equal(pages[0].url, 'https://shop.example/pricing');
  assert.ok(pages[0].slug);
  assert.equal(typeof pages[0].roi.score, 'number');
  assert.deepEqual(pages[0].viewports, {});
  assert.deepEqual(emptyProgress(2, 7), {
    pagesDone: 0, pagesTotal: 2, capturesDone: 0, capturesTotal: 14,
  });
});

test('captureConcurrency and crawlConcurrency cap public callers', () => {
  const config = { pageConcurrency: 12, publicPageConcurrency: 6, crawlConcurrency: 4 };
  assert.equal(captureConcurrency({ publicCaller: true }, config), 6);
  assert.equal(captureConcurrency({}, config), 12);
  assert.equal(crawlConcurrency({ publicCaller: true }, config), 2);
  assert.equal(crawlConcurrency({}, config), 4);
});
