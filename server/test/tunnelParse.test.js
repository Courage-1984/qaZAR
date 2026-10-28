import test from 'node:test';
import assert from 'node:assert/strict';
import {
  DEFAULT_DISCOVERY_GIST,
  buildDiscoveryPayload,
  cloudflaredCandidates,
  discoveryGistId,
  parseTryCloudflareUrl,
} from '../tunnelParse.js';

test('parseTryCloudflareUrl extracts first trycloudflare URL', () => {
  assert.equal(
    parseTryCloudflareUrl('Visit https://abc-123.trycloudflare.com now'),
    'https://abc-123.trycloudflare.com',
  );
  assert.equal(parseTryCloudflareUrl('no tunnel'), null);
});

test('buildDiscoveryPayload and gist id defaults', () => {
  assert.equal(discoveryGistId({}), DEFAULT_DISCOVERY_GIST);
  assert.equal(discoveryGistId({ DISCOVERY_GIST_ID: 'x' }), 'x');
  const body = buildDiscoveryPayload({
    url: 'https://a.trycloudflare.com',
    lanUrl: 'http://192.168.1.2:8787',
    updatedAt: '2024-01-01T00:00:00.000Z',
  });
  assert.deepEqual(JSON.parse(body.files['qazar-discovery.json'].content), {
    url: 'https://a.trycloudflare.com',
    lanUrl: 'http://192.168.1.2:8787',
    updatedAt: '2024-01-01T00:00:00.000Z',
  });
});

test('cloudflaredCandidates includes Windows paths only on win32', () => {
  assert.deepEqual(cloudflaredCandidates('linux'), ['cloudflared']);
  assert.ok(cloudflaredCandidates('win32').some((p) => p.includes('Program Files')));
});
