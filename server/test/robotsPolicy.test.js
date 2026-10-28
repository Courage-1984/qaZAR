import test from 'node:test';
import assert from 'node:assert/strict';
import {
  appliesToQazar,
  decidePathAccess,
  pathMatches,
} from '../crawler/robots.js';

test('appliesToQazar matches star and qazar agents', () => {
  assert.equal(appliesToQazar('*'), true);
  assert.equal(appliesToQazar('qaZARBot'), true);
  assert.equal(appliesToQazar('Googlebot'), false);
});

test('pathMatches treats / as everything and empty as never', () => {
  assert.equal(pathMatches('/pricing', '/'), true);
  assert.equal(pathMatches('/pricing/plan', '/pricing'), true);
  assert.equal(pathMatches('/pricing', '/admin'), false);
  assert.equal(pathMatches('/x', ''), false);
});

test('decidePathAccess lets equal-length allow win over disallow', () => {
  assert.equal(decidePathAccess('/pricing', ['/'], ['/pricing']), true);
  assert.equal(decidePathAccess('/secret', ['/'], ['/pricing']), false);
  assert.equal(decidePathAccess('/any', [], []), true);
  assert.equal(decidePathAccess('/admin', ['/admin'], []), false);
});
