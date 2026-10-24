import { normalizeUrl, isAssetUrl, sameOrigin } from './normalize.js';
import { collectSitemapUrls, discoverSitemaps } from './sitemap.js';

/** Extract same-origin hrefs from HTML (regex; adequate for BFS discovery). */
export function extractLinks(html, baseUrl) {
  const out = new Set();
  for (const m of html.matchAll(/<a\s[^>]*?href\s*=\s*["']([^"'#][^"']*)["']/gi)) {
    const n = normalizeUrl(m[1], baseUrl);
    if (n && sameOrigin(n, baseUrl) && !isAssetUrl(n)) out.add(n);
  }
  return [...out];
}

async function bfs(start, max) {
  const seen = new Set([start]);
  const queue = [start];
  const result = [];
  while (queue.length && result.length < max) {
    const url = queue.shift();
    try {
      const res = await fetch(url, { headers: { 'user-agent': 'qaZAR/0.1' }, signal: AbortSignal.timeout(20000) });
      if (!res.ok || !(res.headers.get('content-type') || '').includes('html')) continue;
      result.push(url);
      for (const l of extractLinks(await res.text(), url)) {
        if (!seen.has(l)) {
          seen.add(l);
          queue.push(l);
        }
      }
    } catch {
      /* skip unreachable page */
    }
  }
  return result;
}

/**
 * Build the page queue: explicit sitemap -> auto-discovered sitemap -> BFS.
 * Returns { urls, source }.
 */
export async function buildQueue({ domain, sitemap_url, max_pages }) {
  const start = normalizeUrl(domain);
  const candidates = sitemap_url ? [sitemap_url] : await discoverSitemaps(domain);
  const urls = [];
  for (const s of candidates) {
    try {
      urls.push(...(await collectSitemapUrls(s, max_pages - urls.length)));
    } catch {
      /* try next */
    }
    if (urls.length >= max_pages) break;
  }
  const uniq = [...new Set(urls)].slice(0, max_pages);
  if (uniq.length) return { urls: uniq, source: 'sitemap' };
  return { urls: await bfs(start, max_pages), source: 'crawl' };
}
