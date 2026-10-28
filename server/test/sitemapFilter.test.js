import test from 'node:test';
import assert from 'node:assert/strict';
import {
  acceptSitemapLoc,
  onHost,
  sitemapLocsFromRobots,
} from '../crawler/sitemapFilter.js';

test('onHost allows unset origin and matching hosts', () => {
  assert.equal(onHost('https://a.com/x', null), true);
  assert.equal(onHost('https://a.com/x', 'https://a.com'), true);
  assert.equal(onHost('https://b.com/x', 'https://a.com'), false);
});

test('acceptSitemapLoc drops assets and off-site locs', () => {
  assert.equal(acceptSitemapLoc('https://a.com/page', 'https://a.com'), 'https://a.com/page');
  assert.equal(acceptSitemapLoc('https://a.com/x.pdf', 'https://a.com'), null);
  assert.equal(acceptSitemapLoc('https://b.com/page', 'https://a.com'), null);
  assert.equal(acceptSitemapLoc(''), null);
});

test('sitemapLocsFromRobots keeps same-host entries', () => {
  const text = 'Sitemap: https://a.com/s.xml\nSitemap: https://cdn.example/s.xml\n';
  assert.deepEqual(sitemapLocsFromRobots(text, 'https://a.com'), ['https://a.com/s.xml']);
  assert.deepEqual(sitemapLocsFromRobots('', 'https://a.com'), []);
});
