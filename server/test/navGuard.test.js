import test from 'node:test';
import assert from 'node:assert/strict';
import { config } from '../config.js';
import { blockedHttpUrl, decideNav, isBlockedHost } from '../engine/navGuard.js';

test('isBlockedHost covers metadata, .internal, and private literals', () => {
  assert.equal(isBlockedHost(''), false);
  assert.equal(isBlockedHost(null), false);
  assert.equal(isBlockedHost('metadata.google.internal'), true);
  assert.equal(isBlockedHost('METADATA.GOOGLE.INTERNAL'), true);
  assert.equal(isBlockedHost('svc.cluster.internal'), true);
  assert.equal(isBlockedHost('kubernetes.default'), true);
  assert.equal(isBlockedHost('127.0.0.1'), true);
  assert.equal(isBlockedHost('[::1]'), true);
  assert.equal(isBlockedHost('10.0.0.5'), true);
  assert.equal(isBlockedHost('169.254.169.254'), true);
  assert.equal(isBlockedHost('example.com'), false);
  assert.equal(isBlockedHost('1.1.1.1'), false);
});

test('blockedHttpUrl only flags http(s) private or metadata hosts', () => {
  assert.equal(blockedHttpUrl('http://127.0.0.1/x'), true);
  assert.equal(blockedHttpUrl('https://metadata.google.internal/'), true);
  assert.equal(blockedHttpUrl('https://example.com/'), false);
  assert.equal(blockedHttpUrl('data:text/html,hi'), false);
  assert.equal(blockedHttpUrl('not a url'), false);
});

test('decideNav aborts blocked hosts and private document navigations', async () => {
  assert.equal(await decideNav('http://10.0.0.1/a.png', 'image'), 'abort');
  assert.equal(await decideNav('https://example.com/a.png', 'image'), 'continue');
  assert.equal(await decideNav('data:text/html,hi', 'document'), 'abort');
  const prev = config.allowPrivate;
  config.allowPrivate = true;
  assert.equal(await decideNav('https://example.com/', 'document'), 'continue');
  config.allowPrivate = prev;
});
