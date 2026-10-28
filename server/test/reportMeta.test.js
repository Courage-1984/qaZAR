import test from 'node:test';
import assert from 'node:assert/strict';
import {
  flattenRoadmap,
  reportDomain,
  reportDownloadName,
  reportTimingLine,
  viewportViolationTallies,
} from '../report/reportMeta.js';

test('reportTimingLine and reportDomain pin empty and filled shapes', () => {
  assert.equal(reportTimingLine({}), '');
  assert.equal(reportTimingLine({ crawlMs: 10, captureMs: 20 }), 'Discovery 10 ms. Capture 20 ms');
  assert.equal(reportDomain({}), 'Unknown domain');
  assert.equal(reportDomain({ input: { domain: 'https://x.com' } }), 'https://x.com');
});

test('reportDownloadName sanitises domain for Content-Disposition', () => {
  assert.equal(
    reportDownloadName({ id: 'abc', input: { domain: 'https://shop.example/path' } }),
    'qaZAR-audit-shop.example_path.html',
  );
  assert.equal(reportDownloadName({ id: 'abc' }), 'qaZAR-audit-abc.html');
});

test('flattenRoadmap and viewportViolationTallies skip pending/error', () => {
  assert.deepEqual(flattenRoadmap({
    quickWins: ['a'], coreUx: ['b'], strategic: ['c'],
  }), ['a', 'b', 'c']);
  const tallies = viewportViolationTallies([{
    viewports: {
      desktop: {
        status: 'unchanged',
        violations: [
          { severity: 'error' },
          { severity: 'warn' },
          { severity: 'info' },
        ],
      },
      mobile: { status: 'error', violations: [{ severity: 'error' }] },
      tablet: { status: 'pending', violations: [{ severity: 'warn' }] },
    },
  }], ['desktop', 'mobile', 'tablet']);
  assert.deepEqual(tallies, [
    { name: 'desktop', errors: 1, warns: 1 },
    { name: 'mobile', errors: 0, warns: 0 },
    { name: 'tablet', errors: 0, warns: 0 },
  ]);
});
