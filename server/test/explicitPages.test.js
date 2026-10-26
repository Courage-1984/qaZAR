import test from 'node:test';
import assert from 'node:assert/strict';
import { resolveExplicitPages } from '../crawler/explicitPages.js';

const domain = 'https://example.com/';

test('resolves paths and full URLs onto the submitted domain', () => {
  const pages = resolveExplicitPages(domain, '/pricing\nhttps://example.com/about/\npricing');
  assert.deepEqual(pages, ['https://example.com/pricing', 'https://example.com/about']);
});

test('accepts a schemeless host and drops blanks, comments, and duplicates', () => {
  const pages = resolveExplicitPages(domain, ['', '# skip', 'example.com/contact', 'https://example.com/contact?utm_source=ad']);
  assert.deepEqual(pages, ['https://example.com/contact']);
});

test('rejects a page on another site', () => {
  assert.throws(() => resolveExplicitPages(domain, 'https://other.example/pricing'), /must be on example.com/);
});

test('rejects files and lists over the cap', () => {
  assert.throws(() => resolveExplicitPages(domain, '/guide.pdf'), /not an HTML page/);
  assert.throws(() => resolveExplicitPages(domain, '/a\n/b\n/c', 2), /exceeds the limit of 2/);
});

test('an empty list means discover pages as usual', () => {
  assert.deepEqual(resolveExplicitPages(domain, ' \n# none\n'), []);
});
