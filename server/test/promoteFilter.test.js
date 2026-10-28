import test from 'node:test';
import assert from 'node:assert/strict';
import { canPromoteCapture, promoteCandidates } from '../visual/promoteFilter.js';

test('canPromoteCapture rejects errors and missing shots', () => {
  assert.equal(canPromoteCapture({ status: 'new', shot: 'a.png' }), true);
  assert.equal(canPromoteCapture({ status: 'error', shot: 'a.png' }), false);
  assert.equal(canPromoteCapture({ status: 'new', shot: null }), false);
  assert.equal(canPromoteCapture(null), false);
});

test('promoteCandidates respects slug and viewport filters', () => {
  const run = {
    pages: [
      {
        slug: 'home',
        viewports: {
          desktop: { status: 'new', shot: 'home/desktop.png' },
          mobile: { status: 'error', shot: 'home/mobile.png' },
        },
      },
      {
        slug: 'about',
        viewports: {
          desktop: { status: 'unchanged', shot: 'about/desktop.png' },
        },
      },
    ],
  };
  assert.deepEqual([...promoteCandidates(run)].map((c) => `${c.page.slug}:${c.vp}`), [
    'home:desktop',
    'about:desktop',
  ]);
  assert.deepEqual([...promoteCandidates(run, { slug: 'home' })].map((c) => c.vp), ['desktop']);
  assert.deepEqual([...promoteCandidates(run, { viewport: 'desktop' })].map((c) => c.page.slug), [
    'home',
    'about',
  ]);
});
