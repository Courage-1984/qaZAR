import test from 'node:test';
import assert from 'node:assert/strict';
import { config } from '../config.js';
import {
  assertPublicUrl, embeddedIpv4, isMetadataHost, isPrivateIp, parseProspectEmail,
} from '../routes/ssrf.js';
import { validateRunInput } from '../routes/validate.js';

test('isMetadataHost blocks cluster and metadata names only', () => {
  assert.equal(isMetadataHost('metadata.google.internal'), true);
  assert.equal(isMetadataHost('foo.internal'), true);
  assert.equal(isMetadataHost('kubernetes.default'), true);
  assert.equal(isMetadataHost(''), false);
  assert.equal(isMetadataHost('example.com'), false);
  assert.equal(isMetadataHost('127.0.0.1'), false);
});

test('parseProspectEmail accepts empty and valid, rejects junk', () => {
  assert.equal(parseProspectEmail(''), '');
  assert.equal(parseProspectEmail('  ada@shop.example  '), 'ada@shop.example');
  assert.throws(() => parseProspectEmail('not-an-email'), /prospectEmail/);
  assert.throws(() => parseProspectEmail(`${'a'.repeat(250)}@x.co`), /prospectEmail/);
});

test('embeddedIpv4 and isPrivateIp cover mapped loopback', () => {
  assert.equal(embeddedIpv4('127.0.0.1'), '127.0.0.1');
  assert.equal(embeddedIpv4('::ffff:127.0.0.1'), '127.0.0.1');
  assert.equal(isPrivateIp('8.8.8.8'), false);
  assert.equal(isPrivateIp('192.168.1.1'), true);
  assert.equal(isPrivateIp('::1'), true);
});

test('assertPublicUrl blocks metadata even when ALLOW_PRIVATE is on', async () => {
  const prev = config.allowPrivate;
  config.allowPrivate = true;
  await assert.rejects(
    () => assertPublicUrl('http://metadata.google.internal/', 'domain'),
    /host is not allowed/,
  );
  const ok = await assertPublicUrl('http://127.0.0.1/', 'domain');
  assert.equal(ok, 'http://127.0.0.1/');
  config.allowPrivate = prev;
});

test('validateRunInput caps public callers and strips sitemap', async () => {
  const prev = config.allowPrivate;
  config.allowPrivate = true;
  const input = await validateRunInput(
    {
      domain: 'http://127.0.0.1',
      sitemap_url: 'http://127.0.0.1/sitemap.xml',
      max_pages: 50,
      renderJs: true,
      prospectName: 'x'.repeat(200),
      source: 'y'.repeat(80),
    },
    { publicCaller: true, pageCap: 5 },
  );
  assert.equal(input.max_pages, 5);
  assert.equal(input.renderJs, false);
  assert.equal(input.sitemap_url, null);
  assert.equal(input.prospectName.length, 120);
  assert.equal(input.source.length, 40);
  config.allowPrivate = prev;
});
