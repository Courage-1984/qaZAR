import test from 'node:test';
import assert from 'node:assert/strict';
import {
  MAX_FETCH_BYTES,
  MAX_REDIRECT_HOPS,
  contentLengthExceeds,
  isGzipMagic,
  isRedirectStatus,
  resolveRedirectTarget,
} from '../crawler/fetchBounds.js';

test('fetch bounds constants pin 2MB and 5 hops', () => {
  assert.equal(MAX_FETCH_BYTES, 2 * 1024 * 1024);
  assert.equal(MAX_REDIRECT_HOPS, 5);
});

test('isRedirectStatus excludes 304 and non-3xx', () => {
  assert.equal(isRedirectStatus(301), true);
  assert.equal(isRedirectStatus(302), true);
  assert.equal(isRedirectStatus(304), false);
  assert.equal(isRedirectStatus(200), false);
  assert.equal(isRedirectStatus(404), false);
});

test('contentLengthExceeds and gzip magic', () => {
  assert.equal(contentLengthExceeds(String(MAX_FETCH_BYTES + 1)), true);
  assert.equal(contentLengthExceeds(String(MAX_FETCH_BYTES)), false);
  assert.equal(contentLengthExceeds('nope'), false);
  assert.equal(isGzipMagic(Buffer.from([0x1f, 0x8b, 0x00])), true);
  assert.equal(isGzipMagic(Buffer.from([0x00, 0x00])), false);
});

test('resolveRedirectTarget joins relative locations', () => {
  assert.equal(
    resolveRedirectTarget('https://a.com/x', '/y'),
    'https://a.com/y',
  );
  assert.equal(resolveRedirectTarget('https://a.com/x', null), null);
});
