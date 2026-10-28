import test from 'node:test';
import assert from 'node:assert/strict';
import { pathHasContact, pathHasPricing, scoreSecurity } from '../crawler/securityScore.js';

test('scoreSecurity pins deductions and flags', () => {
  assert.deepEqual(scoreSecurity({}), { score: 100, flags: [], measured: true });
  const bad = scoreSecurity({
    isHttps: false, hasHsts: false, hasCsp: false, insecureFormsCount: 2,
  });
  assert.equal(bad.score, 5);
  assert.deepEqual(bad.flags, [
    'Insecure HTTP', 'Missing HSTS', 'Missing CSP', 'Insecure Form Submission',
  ]);
});

test('pathHasContact and pathHasPricing match lead-heat URL tokens', () => {
  assert.equal(pathHasContact('https://x.com/team'), true);
  assert.equal(pathHasContact('https://x.com/booking'), true);
  assert.equal(pathHasContact('https://x.com/about'), false);
  assert.equal(pathHasPricing('https://x.com/pricing'), true);
  assert.equal(pathHasPricing('https://x.com/plans/pro'), true);
  assert.equal(pathHasPricing('https://x.com/about'), false);
});
