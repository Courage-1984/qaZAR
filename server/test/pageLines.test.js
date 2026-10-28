import test from 'node:test';
import assert from 'node:assert/strict';
import { ensureHttpScheme, pageInputLines } from '../crawler/pageLines.js';

test('ensureHttpScheme adds https to bare hosts and leaves paths alone', () => {
  assert.equal(ensureHttpScheme('example.com/x'), 'https://example.com/x');
  assert.equal(ensureHttpScheme('https://example.com/x'), 'https://example.com/x');
  assert.equal(ensureHttpScheme('/pricing'), '/pricing');
  assert.equal(ensureHttpScheme('?q=1'), '?q=1');
  assert.equal(ensureHttpScheme('mailto:a@b.c'), 'mailto:a@b.c');
});

test('pageInputLines drops blanks and comments', () => {
  assert.deepEqual(pageInputLines(' \n# skip\n/a\r\n/b '), ['/a', '/b']);
  assert.deepEqual(pageInputLines(['', '# x', ' /c ']), ['/c']);
  assert.deepEqual(pageInputLines(null), []);
});
