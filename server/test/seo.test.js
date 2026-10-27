import test from 'node:test';
import assert from 'node:assert/strict';
import { extractPageSeo, summarizeSeo } from '../crawler/seo.js';
import { renderSeoSection } from '../report/seoSection.js';

const clean = `
  <html lang="en">
    <head>
      <title>Pricing for Northwind Analytics</title>
      <meta name="description" content="Plans and pricing for Northwind Analytics teams.">
      <link rel="canonical" href="https://shop.example/pricing">
      <meta property="og:title" content="Pricing">
      <meta property="og:image" content="https://shop.example/og.png">
      <script type="application/ld+json">{"@context":"https://schema.org","@type":"WebPage","name":"Pricing"}</script>
    </head>
    <body><h1>Pricing</h1></body>
  </html>
`;

function page(html, url, headers) {
  return extractPageSeo(html, url, headers);
}

test('clean page scores 100 with no issues', () => {
  const seo = summarizeSeo([page(clean, 'https://shop.example/pricing')]);
  assert.equal(seo.score, 100);
  assert.equal(seo.issues.length, 0);
  assert.equal(seo.pages[0].indexable, true);
  assert.equal(seo.pages[0].title, 'Pricing for Northwind Analytics');
});

test('missing title is an error and costs 20 points', () => {
  const html = `<html lang="en"><head>
    <meta name="description" content="A product page description for shoppers comparing plans.">
    <link rel="canonical" href="https://shop.example/item">
    <meta property="og:title" content="Item"><meta property="og:image" content="https://shop.example/og.png">
  </head><body><h1>Item</h1></body></html>`;
  const seo = summarizeSeo([page(html, 'https://shop.example/item')]);
  assert.equal(seo.score, 80);
  assert.ok(seo.issues.some((i) => i.id === 'seo-missing-title' && i.severity === 'error'));
});

test('duplicate titles are one warn group and cost 10 points', () => {
  const html = (path) => `<html lang="en"><head>
    <title>Same Title Here</title>
    <meta name="description" content="Unique copy for ${path} that is long enough to count.">
    <link rel="canonical" href="https://shop.example${path}">
    <meta property="og:title" content="T"><meta property="og:image" content="https://shop.example/og.png">
  </head><body><h1>${path}</h1></body></html>`;
  const seo = summarizeSeo([
    page(html('/a'), 'https://shop.example/a'),
    page(html('/b'), 'https://shop.example/b'),
  ]);
  assert.equal(seo.score, 90);
  assert.equal(seo.issues.filter((i) => i.id === 'seo-duplicate-title').length, 2);
});

test('meta robots noindex is an error and costs 25 points', () => {
  const html = clean.replace('<head>', '<head><meta name="robots" content="noindex, nofollow">');
  const seo = summarizeSeo([page(html, 'https://shop.example/pricing')]);
  assert.equal(seo.score, 75);
  assert.ok(seo.issues.some((i) => i.id === 'seo-noindex' && i.severity === 'error'));
  assert.equal(seo.pages[0].indexable, false);
});

test('X-Robots-Tag googlebot noindex is detected and other bots are ignored', () => {
  const hit = page(clean, 'https://shop.example/pricing', {
    get: (n) => (n === 'x-robots-tag' ? 'googlebot: noindex' : null),
  });
  assert.equal(hit.noindex, true);
  const miss = page(clean, 'https://shop.example/pricing', {
    get: (n) => (n === 'x-robots-tag' ? 'otherbot: noindex' : null),
  });
  assert.equal(miss.noindex, false);
});

test('vague Home title is a warning and does not change the score', () => {
  const html = clean.replace('Pricing for Northwind Analytics', 'Home');
  const seo = summarizeSeo([page(html, 'https://shop.example/')]);
  assert.equal(seo.score, 100);
  assert.ok(seo.issues.some((i) => i.id === 'seo-vague-title' && i.severity === 'warn'));
});

test('invalid JSON-LD costs 8 points', () => {
  const html = clean.replace(
    '{"@context":"https://schema.org","@type":"WebPage","name":"Pricing"}',
    '{not json',
  );
  const seo = summarizeSeo([page(html, 'https://shop.example/pricing')]);
  assert.equal(seo.score, 92);
  assert.ok(seo.issues.some((i) => i.id === 'seo-jsonld-invalid' && i.severity === 'warn'));
});

test('robots.txt disallow is an error and three blocked pages cap at 50 points', () => {
  const one = summarizeSeo(
    [page(clean, 'https://shop.example/pricing')],
    { disallows: ['/'], allows: [] },
  );
  assert.equal(one.score, 75);
  assert.ok(one.issues.some((i) => i.id === 'seo-robots-disallow'));
  assert.equal(one.pages[0].indexable, false);

  const three = summarizeSeo(
    ['/a', '/b', '/c'].map((path) => page(
      clean
        .replace('Pricing for Northwind Analytics', `Pricing page ${path}`)
        .replace('Plans and pricing for Northwind Analytics teams.', `Plans for ${path} and the teams that buy them.`),
      `https://shop.example${path}`,
    )),
    { disallows: ['/'], allows: [] },
  );
  assert.equal(three.score, 50);
});

test('search section escapes titles and issue text', () => {
  const html = renderSeoSection({
    seo: {
      score: 80,
      issues: [{ id: 'seo-missing-title', severity: 'error', url: 'https://shop.example/a', detail: '<script>alert(1)</script>' }],
      pages: [{ url: 'https://shop.example/a', title: '<b>x</b>', descriptionLength: 0, indexable: false, h1Count: 0 }],
    },
  });
  assert.equal(html.includes('<script>'), false);
  assert.ok(html.includes('&lt;script&gt;alert(1)&lt;/script&gt;'));
  assert.ok(html.includes('&lt;b&gt;x&lt;/b&gt;'));
  assert.ok(html.includes('Search Appearance'));
});
