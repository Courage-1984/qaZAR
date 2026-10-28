import test from 'node:test';
import assert from 'node:assert/strict';
import { linkHref, scanMeta } from '../crawler/seoMeta.js';

test('scanMeta keeps first name/property and collects robots chunks', () => {
  const html = `
    <meta name="robots" content="noindex">
    <meta name="description" content="one">
    <meta name="description" content="two">
    <meta property="og:title" content="Hi">
    <meta name="googlebot" content="nofollow">
  `;
  const got = scanMeta(html);
  assert.deepEqual(got.robots, ['noindex', 'nofollow']);
  assert.equal(got.named.description, 'one');
  assert.equal(got.props['og:title'], 'Hi');
});

test('linkHref finds canonical and returns null when missing', () => {
  const html = `<link rel="stylesheet" href="/a.css"><link rel="canonical" href="https://ex.com/">`;
  assert.equal(linkHref(html, 'canonical'), 'https://ex.com/');
  assert.equal(linkHref(html, 'alternate'), null);
});
