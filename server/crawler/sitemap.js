import { XMLParser } from 'fast-xml-parser';
import { config } from '../config.js';
import { fetchPublicText } from './safeFetch.js';
import { acceptSitemapLoc, onHost, sitemapLocsFromRobots } from './sitemapFilter.js';

const parser = new XMLParser({ ignoreAttributes: true });
const arr = (x) => (x == null ? [] : Array.isArray(x) ? x : [x]);

/** Parse sitemap XML text into { urls, sitemaps } (pure; unit-testable). */
export function parseSitemapXml(xml) {
  const doc = parser.parse(xml);
  const urls = arr(doc.urlset?.url).map((u) => u.loc).filter(Boolean);
  const sitemaps = arr(doc.sitemapindex?.sitemap).map((s) => s.loc).filter(Boolean);
  return { urls, sitemaps };
}

/**
 * Fetch a sitemap until `limit` URLs are collected.
 * Child sitemaps in one wave are fetched together, then appended in document order.
 * `origin` drops any URL whose host is not the submitted site.
 */
export async function collectSitemapUrls(sitemapUrl, limit, seen = new Set(), concurrency = config.crawlConcurrency, origin = null) {
  if (limit <= 0 || seen.has(sitemapUrl) || seen.size > 25 || !onHost(sitemapUrl, origin)) return [];
  seen.add(sitemapUrl);
  const { text } = await fetchPublicText(sitemapUrl, { timeout: 20000, label: 'sitemap' });
  const { urls, sitemaps } = parseSitemapXml(text);
  const out = [];
  for (const u of urls) {
    const n = acceptSitemapLoc(u, origin);
    if (!n) continue;
    out.push(n);
    if (out.length >= limit) return out;
  }
  const children = sitemaps.map((s) => String(s).trim()).filter((s) => onHost(s, origin));
  const width = Math.max(1, concurrency);
  for (let i = 0; i < children.length && out.length < limit; i += width) {
    const need = limit - out.length;
    const batch = children.slice(i, i + width);
    const groups = await Promise.all(batch.map((child) =>
      collectSitemapUrls(child, need, seen, concurrency, origin).catch(() => []),
    ));
    for (const group of groups) {
      for (const u of group) {
        if (out.length >= limit) return out;
        out.push(u);
      }
    }
  }
  return out;
}

/** Discover sitemap URLs from robots.txt, falling back to /sitemap.xml. Off-site entries are dropped. */
export async function discoverSitemaps(domain) {
  const origin = new URL(domain).origin;
  let found = [];
  try {
    const { text } = await fetchPublicText(`${origin}/robots.txt`, { timeout: 5000, label: 'robots' });
    found = sitemapLocsFromRobots(text, origin);
  } catch {
    /* no robots */
  }
  if (!found.length) found.push(`${origin}/sitemap.xml`);
  return found;
}
