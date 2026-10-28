import test from 'node:test';
import assert from 'node:assert/strict';
import { filterAllowedHostUrls, seoForSelected } from '../crawler/crawlSelect.js';

test('filterAllowedHostUrls drops off-host and disallowed paths', () => {
  const start = 'https://ex.com/';
  const rules = { disallows: ['/private'], allows: [], crawlDelay: 0 };
  const got = filterAllowedHostUrls([
    'https://ex.com/a',
    'https://ex.com/a',
    'https://other.com/a',
    'https://ex.com/private/x',
  ], start, rules);
  assert.deepEqual(got, ['https://ex.com/a']);
});

test('seoForSelected only scores pages in the capture set', () => {
  const signals = [
    { url: 'https://ex.com/', seo: { url: 'https://ex.com/', title: 'Home', description: 'd'.repeat(80), h1Count: 1, noindex: false, jsonLdInvalid: false } },
    { url: 'https://ex.com/skip', seo: { url: 'https://ex.com/skip', title: '', description: '', h1Count: 0, noindex: false, jsonLdInvalid: false } },
  ];
  const seo = seoForSelected(signals, ['https://ex.com/'], null);
  assert.equal(seo.pages.length, 1);
  assert.equal(seo.pages[0].url, 'https://ex.com/');
});
