import test from 'node:test';
import assert from 'node:assert/strict';
import {
  attr,
  clipText,
  decodeEntities,
  headerValue,
  isRobotsBlocked,
  robotsTokensFrom,
  stripBoilerplate,
} from '../crawler/htmlBits.js';

test('decodeEntities and attr pin SEO HTML parsing', () => {
  assert.equal(decodeEntities('A&nbsp;&amp;&lt;b&gt;'), 'A &<b>');
  assert.equal(attr('<meta name="robots" content="noindex">', 'content'), 'noindex');
  assert.equal(attr("<a href='x'>", 'href'), 'x');
  assert.equal(attr('<div>', 'href'), null);
});

test('stripBoilerplate removes script and style bodies', () => {
  const out = stripBoilerplate('<p>ok</p><script>hide()</script><style>.x{}</style>');
  assert.match(out, /<p>ok<\/p>/);
  assert.equal(out.includes('hide'), false);
  assert.equal(out.includes('.x'), false);
});

test('robotsTokensFrom keeps googlebot/* scoped tokens only', () => {
  assert.deepEqual(robotsTokensFrom('noindex, nofollow'), ['noindex', 'nofollow']);
  assert.deepEqual(robotsTokensFrom('googlebot: noindex, otherbot: noindex'), ['noindex']);
  assert.deepEqual(robotsTokensFrom('*: none'), ['none']);
  assert.equal(isRobotsBlocked(['otherbot: noindex']), false);
  assert.equal(isRobotsBlocked(['googlebot: noindex']), true);
  assert.equal(isRobotsBlocked(['none']), true);
});

test('headerValue and clipText tolerate shapes', () => {
  assert.equal(headerValue({ get: (n) => (n === 'x-robots-tag' ? 'noindex' : null) }, 'x-robots-tag'), 'noindex');
  assert.equal(headerValue({ 'content-type': 'text/html' }, 'Content-Type'), 'text/html');
  assert.equal(headerValue(null, 'x'), '');
  assert.equal(clipText('abcdef', 4), 'abc…');
  assert.equal(clipText('ab', 4), 'ab');
});
