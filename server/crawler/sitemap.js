import zlib from 'node:zlib';
import { XMLParser } from 'fast-xml-parser';
import { normalizeUrl, isAssetUrl } from './normalize.js';

const parser = new XMLParser({ ignoreAttributes: true });
const arr = (x) => (x == null ? [] : Array.isArray(x) ? x : [x]);

async function fetchText(url) {
  const res = await fetch(url, { headers: { 'user-agent': 'qaZAR/0.1' }, signal: AbortSignal.timeout(20000) });
  if (!res.ok) throw new Error(`HTTP ${res.status} for ${url}`);
  let buf = Buffer.from(await res.arrayBuffer());
  if (buf[0] === 0x1f && buf[1] === 0x8b) buf = zlib.gunzipSync(buf);
  return buf.toString('utf8');
}

/** Parse sitemap XML text into { urls, sitemaps } (pure; unit-testable). */
export function parseSitemapXml(xml) {
  const doc = parser.parse(xml);
  const urls = arr(doc.urlset?.url).map((u) => u.loc).filter(Boolean);
  const sitemaps = arr(doc.sitemapindex?.sitemap).map((s) => s.loc).filter(Boolean);
  return { urls, sitemaps };
}

/** Fetch a sitemap (recursing into indexes) until `limit` URLs are collected. */
export async function collectSitemapUrls(sitemapUrl, limit, seen = new Set()) {
  if (seen.has(sitemapUrl) || seen.size > 25) return [];
  seen.add(sitemapUrl);
  const { urls, sitemaps } = parseSitemapXml(await fetchText(sitemapUrl));
  const out = [];
  for (const u of urls) {
    const n = normalizeUrl(String(u).trim());
    if (n && !isAssetUrl(n)) out.push(n);
    if (out.length >= limit) return out;
  }
  for (const s of sitemaps) {
    try {
      out.push(...(await collectSitemapUrls(String(s).trim(), limit - out.length, seen)));
    } catch {
      /* skip broken child sitemap */
    }
    if (out.length >= limit) break;
  }
  return out;
}

/** Discover sitemap URLs from robots.txt, falling back to /sitemap.xml. */
export async function discoverSitemaps(domain) {
  const origin = new URL(domain).origin;
  const found = [];
  try {
    const robots = await fetchText(`${origin}/robots.txt`);
    for (const m of robots.matchAll(/^\s*sitemap:\s*(\S+)/gim)) found.push(m[1]);
  } catch {
    /* no robots */
  }
  if (!found.length) found.push(`${origin}/sitemap.xml`);
  return found;
}
