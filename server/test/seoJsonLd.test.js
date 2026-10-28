import test from 'node:test';
import assert from 'node:assert/strict';
import { collectSeoLdTypes, readSeoJsonLd } from '../crawler/seoJsonLd.js';

test('collectSeoLdTypes walks @graph and arrays', () => {
  const types = collectSeoLdTypes({
    '@graph': [
      { '@type': 'Organization' },
      { '@type': ['WebSite', 'Thing'] },
    ],
  });
  assert.deepEqual(types.sort(), ['Organization', 'Thing', 'WebSite']);
});

test('readSeoJsonLd marks invalid blocks and caps unique types', () => {
  const html = `
    <script type="application/ld+json">{nope</script>
    <script type="application/ld+json">{"@type":"WebPage"}</script>
    <script type="application/ld+json">{"@type":"WebPage"}</script>
  `;
  const got = readSeoJsonLd(html);
  assert.equal(got.blocks, 3);
  assert.equal(got.invalid, true);
  assert.deepEqual(got.types, ['WebPage']);
});
