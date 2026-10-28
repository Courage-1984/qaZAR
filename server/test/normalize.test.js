import test from 'node:test';
import assert from 'node:assert/strict';
import {
  isAssetPath,
  isAssetUrl,
  isTrackingParam,
  normalizeUrl,
  sameHost,
  sameOrigin,
  siteHash,
  slugFor,
  slugStem,
} from '../crawler/normalize.js';

test('isTrackingParam matches utm and click ids', () => {
  assert.equal(isTrackingParam('utm_source'), true);
  assert.equal(isTrackingParam('fbclid'), true);
  assert.equal(isTrackingParam('gclid'), true);
  assert.equal(isTrackingParam('mc_cid'), true);
  assert.equal(isTrackingParam('ref'), true);
  assert.equal(isTrackingParam('page'), false);
  assert.equal(isTrackingParam('referral'), false);
});

test('slugStem maps root and dirty paths', () => {
  assert.equal(slugStem('/'), 'home');
  assert.equal(slugStem('/About Us/'), 'About-Us');
  assert.equal(slugStem('///'), 'page');
  assert.equal(slugStem(`/${'a'.repeat(80)}`), 'a'.repeat(60));
});

test('normalizeUrl strips tracking, hash, and trailing slash', () => {
  assert.equal(normalizeUrl('https://a.com/p/?utm_source=x&b=1#frag'), 'https://a.com/p?b=1');
  assert.equal(normalizeUrl('mailto:a@b.c'), null);
  assert.equal(normalizeUrl('not a url'), null);
});

test('isAssetUrl and sameHost/sameOrigin tolerate junk', () => {
  assert.equal(isAssetPath('/x.png'), true);
  assert.equal(isAssetUrl('https://a.com/style.css'), true);
  assert.equal(isAssetUrl('https://a.com/page'), false);
  assert.equal(isAssetUrl('not-a-url'), false);
  assert.equal(sameOrigin('https://a.com/x', 'https://a.com/y'), true);
  assert.equal(sameOrigin('https://a.com/', 'https://b.com/'), false);
  assert.equal(sameOrigin('bad', 'https://a.com/'), false);
  assert.equal(sameHost('https://A.com/x', 'https://a.com/y'), true);
  assert.equal(sameHost('bad', 'https://a.com/'), false);
});

test('slugFor and siteHash stay stable for identical inputs', () => {
  assert.equal(slugFor('https://a.com/'), slugFor('https://a.com/'));
  assert.notEqual(slugFor('https://a.com/p?x=1'), slugFor('https://a.com/p?x=2'));
  assert.equal(siteHash('https://a.com/x'), siteHash('https://a.com/y'));
  assert.notEqual(siteHash('https://a.com/'), siteHash('https://b.com/'));
});
