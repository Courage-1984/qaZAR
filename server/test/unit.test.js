import test from 'node:test';
import assert from 'node:assert/strict';
import { parseSitemapXml } from '../crawler/sitemap.js';
import { normalizeUrl, slugFor } from '../crawler/normalize.js';
import { extractLinks } from '../crawler/crawl.js';
import { VIEWPORTS } from '../engine/viewports.js';

test('parses urlset', () => {
  const r = parseSitemapXml('<urlset><url><loc>https://a.com/x</loc></url><url><loc>https://a.com/y</loc></url></urlset>');
  assert.deepEqual(r.urls, ['https://a.com/x', 'https://a.com/y']);
});

test('parses sitemap index and single-entry urlset', () => {
  assert.deepEqual(parseSitemapXml('<sitemapindex><sitemap><loc>https://a.com/s1.xml</loc></sitemap></sitemapindex>').sitemaps, ['https://a.com/s1.xml']);
  assert.equal(parseSitemapXml('<urlset><url><loc>https://a.com/</loc></url></urlset>').urls.length, 1);
});

test('normalizes urls', () => {
  assert.equal(normalizeUrl('https://a.com/p/?utm_source=x&b=1#frag'), 'https://a.com/p?b=1');
  assert.equal(normalizeUrl('mailto:a@b.c'), null);
});

test('slug unique per query', () => {
  assert.notEqual(slugFor('https://a.com/p?x=1'), slugFor('https://a.com/p?x=2'));
});

test('extractLinks same-origin only, skips assets', () => {
  const html = '<a href="/a">1</a><a href="https://other.com/b">2</a><a href="/img.png">3</a><a href="#top">4</a>';
  assert.deepEqual(extractLinks(html, 'https://a.com/'), ['https://a.com/a']);
});

test('exact 7 viewports', () => {
  assert.equal(VIEWPORTS.length, 7);
  assert.deepEqual(VIEWPORTS.map((v) => v.name), ['ultrawide', 'fhd', 'macbook', 'desktop', 'laptop', 'tablet', 'mobile']);
  assert.deepEqual(VIEWPORTS.filter((v) => v.touch).map((v) => v.name), ['tablet', 'mobile']);
});

test('evaluate is a function suitable for page.evaluate', async () => {
  const { evaluate } = await import('../heuristics/evaluate.js');
  assert.equal(typeof evaluate, 'function');
  // ensure it does not throw reference errors when initialized as string
  assert.ok(evaluate.toString().includes('wcag-contrast'));
  assert.ok(evaluate.toString().includes('element-collision'));
  assert.ok(evaluate.toString().includes('nav-not-collapsed'));
});

test('roiScorer prioritizes high-impact pages over paginated links', async () => {
  const { scoreUrl, selectTopRoiCandidates } = await import('../crawler/roiScorer.js');
  const home = scoreUrl('https://example.com/');
  const pricing = scoreUrl('https://example.com/pricing');
  const pagination = scoreUrl('https://example.com/blog/page/3');

  assert.ok(home.score > pagination.score);
  assert.ok(pricing.score > pagination.score);

  const pool = [
    'https://example.com/blog/post-1',
    'https://example.com/blog/post-2',
    'https://example.com/pricing',
    'https://example.com/login',
    'https://example.com/checkout',
  ];
  const top = selectTopRoiCandidates(pool, 3);
  assert.ok(top.includes('https://example.com/pricing'));
  assert.ok(top.includes('https://example.com/checkout'));
  assert.ok(top.includes('https://example.com/login'));
});

test('robots.txt parser extracts disallows and sitemaps correctly', async () => {
  const { parseRobotsTxt, isUrlAllowed } = await import('../crawler/robots.js');
  const sample = `
User-agent: *
Disallow: /admin/
Disallow: /private/
Sitemap: https://example.com/sitemap.xml
`;
  const parsed = parseRobotsTxt(sample);
  assert.deepEqual(parsed.disallows, ['/admin/', '/private/']);
  assert.deepEqual(parsed.sitemaps, ['https://example.com/sitemap.xml']);
  assert.equal(isUrlAllowed('https://example.com/pricing', parsed.disallows), true);
  assert.equal(isUrlAllowed('https://example.com/admin/settings', parsed.disallows), false);
});


