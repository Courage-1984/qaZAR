import test from 'node:test';
import assert from 'node:assert/strict';
import {
  classifyFunnelUrl,
  countBlockingHeadScripts,
  countUnlazyImages,
  detectTechStack,
} from '../crawler/techStack.js';

test('detectTechStack pins Shopify, GA, and WordPress fingerprints', () => {
  assert.deepEqual(
    detectTechStack('<script src="https://cdn.shopify.com/x.js"></script><script src="https://www.googletagmanager.com/gtm.js"></script>').sort(),
    ['Google Analytics/GTM', 'Shopify'],
  );
  assert.ok(detectTechStack('<link href="/wp-content/themes/a.css">').includes('WordPress'));
  assert.deepEqual(detectTechStack('<p>plain</p>'), []);
});

test('classifyFunnelUrl matches path tokens', () => {
  assert.equal(classifyFunnelUrl('https://x.com/pricing').isPricing, true);
  assert.equal(classifyFunnelUrl('https://x.com/cart').isCheckout, true);
  assert.equal(classifyFunnelUrl('https://x.com/login').isAuth, true);
  assert.equal(classifyFunnelUrl('https://x.com/support').isContact, true);
  assert.equal(classifyFunnelUrl('https://x.com/about').isPricing, false);
});

test('countBlockingHeadScripts ignores async defer module and JSON-LD', () => {
  const html = `<head>
    <script src="/a.js"></script>
    <script async src="/b.js"></script>
    <script defer src="/c.js"></script>
    <script type="module" src="/d.js"></script>
    <script type="application/ld+json">{}</script>
  </head><body><script src="/body.js"></script></body>`;
  assert.equal(countBlockingHeadScripts(html), 1);
  assert.equal(countUnlazyImages('<img src="a"><img loading="lazy" src="b">'), 1);
});
