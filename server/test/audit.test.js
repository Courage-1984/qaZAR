import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { PNG } from 'pngjs';
import { assertPublicUrl, isPrivateIp } from '../routes/validate.js';
import { fetchPublic } from '../crawler/safeFetch.js';
import { collectSitemapUrls } from '../crawler/sitemap.js';
import { isUrlAllowed, parseRobotsTxt } from '../crawler/robots.js';
import { diffImages } from '../visual/diff.js';

test('mapped ipv6 and nat64 loopback addresses are private', async () => {
  assert.equal(isPrivateIp('::ffff:7f00:1'), true);
  assert.equal(isPrivateIp('::ffff:a9fe:a9fe'), true);
  assert.equal(isPrivateIp('64:ff9b::a9fe:a9fe'), true);
  assert.equal(isPrivateIp('1.1.1.1'), false);
  await assert.rejects(() => assertPublicUrl('http://[::ffff:127.0.0.1]/', 'domain'), /private address/);
});

test('a redirect to loopback is rejected before the next request', async () => {
  let hops = 0;
  const fetchImpl = async () => {
    hops += 1;
    return new Response(null, { status: 302, headers: { location: 'http://127.0.0.1/' } });
  };
  await assert.rejects(() => fetchPublic('http://1.1.1.1/start', { fetchImpl, label: 'page' }), /private address/);
  assert.equal(hops, 1);
});

test('an off-site sitemap is dropped before it is fetched', async () => {
  const urls = await collectSitemapUrls('https://evil.test/sitemap.xml', 10, new Set(), 1, 'https://example.com');
  assert.deepEqual(urls, []);
});

test('grouped user-agents share rules and allow beats a shorter disallow', () => {
  const grouped = parseRobotsTxt('User-agent: *\nUser-agent: Googlebot\nDisallow: /hidden\n');
  assert.deepEqual(grouped.disallows, ['/hidden']);
  assert.equal(isUrlAllowed('https://example.com/hidden', grouped), false);

  const allow = parseRobotsTxt('User-agent: *\nDisallow: /\nAllow: /pricing\n');
  assert.equal(isUrlAllowed('https://example.com/pricing', allow), true);
  assert.equal(isUrlAllowed('https://example.com/secret', allow), false);
});

test('a one pixel height change is not a size change', () => {
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'qazar-diff-'));
  const write = (file, w, h) => {
    const png = new PNG({ width: w, height: h });
    png.data.fill(0);
    fs.writeFileSync(file, PNG.sync.write(png));
  };
  const a = path.join(dir, 'a.png');
  const b = path.join(dir, 'b.png');
  const big = path.join(dir, 'big.png');
  const diff = path.join(dir, 'd.png');
  write(a, 100, 100);
  write(b, 100, 101);
  write(big, 100, 120);
  assert.equal(diffImages(a, b, diff).sizeChanged, false);
  assert.equal(diffImages(a, big, diff).sizeChanged, true);
  fs.rmSync(dir, { recursive: true, force: true });
});
