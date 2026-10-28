import test from 'node:test';
import assert from 'node:assert/strict';
import {
  HIGH_ROI_PATTERNS,
  PENALTY_PATTERNS,
  applyRoiPatterns,
  pickRoiCandidates,
} from '../crawler/roiPatterns.js';

test('HIGH_ROI and PENALTY tables pin homepage and pagination', () => {
  assert.equal(HIGH_ROI_PATTERNS[0].label, 'homepage');
  assert.equal(HIGH_ROI_PATTERNS[0].score, 100);
  assert.ok(PENALTY_PATTERNS.some((p) => p.label === 'pagination-path' && p.penalty === -40));
});

test('applyRoiPatterns stacks pricing bonus and pagination penalty', () => {
  const home = applyRoiPatterns('/');
  assert.ok(home.labels.includes('homepage'));
  assert.equal(home.delta, 100);
  const pricing = applyRoiPatterns('/pricing');
  assert.ok(pricing.labels.includes('pricing'));
  assert.equal(pricing.delta, 50);
  const page = applyRoiPatterns('/blog/page/3');
  assert.ok(page.labels.includes('pagination-path'));
  assert.equal(page.delta, -40);
  const q = applyRoiPatterns('/blog', '?page=2');
  assert.ok(q.labels.includes('pagination-query'));
});

test('pickRoiCandidates prefers homepage then a lead page', () => {
  const scored = [
    { url: 'https://x.com/blog/1', score: 90, labels: [] },
    { url: 'https://x.com/contact', score: 70, labels: ['contact'] },
    { url: 'https://x.com/', score: 80, labels: ['homepage'] },
    { url: 'https://x.com/a', score: 95, labels: [] },
  ];
  assert.deepEqual(pickRoiCandidates(scored, 2), [
    'https://x.com/',
    'https://x.com/contact',
  ]);
  assert.deepEqual(pickRoiCandidates(scored, 3)[2], 'https://x.com/blog/1');
});
