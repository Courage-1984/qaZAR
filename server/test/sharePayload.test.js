import test from 'node:test';
import assert from 'node:assert/strict';
import { isShareToken, buildSharePayload } from '../routes/sharePayload.js';

test('isShareToken accepts UUID v4 and rejects junk', () => {
  assert.equal(isShareToken('550e8400-e29b-41d4-a716-446655440000'), true);
  assert.equal(isShareToken('not-a-uuid'), false);
  assert.equal(isShareToken(''), false);
  assert.equal(isShareToken(null), false);
  assert.equal(isShareToken('550e8400-e29b-61d4-a716-446655440000'), false); // version nibble
});

test('buildSharePayload for in-progress omits score and review', () => {
  const payload = buildSharePayload({
    status: 'capturing',
    progress: { pagesDone: 1, pagesTotal: 2 },
    input: { domain: 'https://example.com' },
    siteProfile: { leadContacts: { emails: ['secret@x.com'] } },
  }, false);
  assert.deepEqual(payload, {
    status: 'capturing',
    progress: { pagesDone: 1, pagesTotal: 2 },
    domain: 'https://example.com',
    coverage: null,
    score: null,
    review: null,
    hasPdf: false,
    finishedAt: null,
    error: null,
  });
  assert.equal(JSON.stringify(payload).includes('secret@'), false);
  assert.equal(JSON.stringify(payload).includes('leadContacts'), false);
});

test('buildSharePayload for failed surfaces error fallback', () => {
  const withMsg = buildSharePayload({ status: 'failed', error: 'boom', input: {} }, false);
  assert.equal(withMsg.error, 'boom');
  const bare = buildSharePayload({ status: 'failed', input: {} }, true);
  assert.equal(bare.error, 'failed');
  assert.equal(bare.hasPdf, true);
});

test('buildSharePayload for done includes score and review counts only', () => {
  const payload = buildSharePayload({
    status: 'done',
    finishedAt: '2026-10-27T12:00:00.000Z',
    input: { domain: 'https://shop.example' },
    progress: { pagesDone: 1, pagesTotal: 1 },
    pages: [{
      url: 'https://shop.example/',
      slug: 'home',
      viewports: {
        desktop: {
          status: 'new',
          violations: [{ rule: 'overflow-x', severity: 'error', selector: 'body', detail: 'x' }],
        },
      },
    }],
    summary: { violations: { error: 1, warn: 0 }, changed: 0, new: 1 },
    siteProfile: { leadContacts: { emails: ['ceo@shop.example'] } },
  }, true);
  assert.equal(payload.domain, 'https://shop.example');
  // Public share may expose the component-level health score, never contacts.
  assert.equal(typeof payload.score, 'number');
  assert.ok(typeof payload.coverage === 'string' && payload.coverage.length > 0);
  assert.ok(payload.review);
  assert.equal(typeof payload.review.retained, 'number');
  assert.equal(payload.hasPdf, true);
  assert.equal(payload.error, null);
  assert.equal(JSON.stringify(payload).includes('ceo@'), false);
  assert.equal('pages' in payload, false);
  assert.equal('siteProfile' in payload, false);
});
