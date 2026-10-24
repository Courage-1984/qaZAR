import { normalizeUrl, isAssetUrl, sameOrigin } from './normalize.js';
import { collectSitemapUrls, discoverSitemaps } from './sitemap.js';
import { extractLinksHeadless } from './headlessCrawl.js';
import { selectTopRoiCandidates } from './roiScorer.js';

/** Extract same-origin hrefs from HTML (regex; fast for static discovery). */
export function extractLinks(html, baseUrl) {
  const out = new Set();
  for (const m of html.matchAll(/<a\s[^>]*?href\s*=\s*["']([^"'#][^"']*)["']/gi)) {
    const n = normalizeUrl(m[1], baseUrl);
    if (n && sameOrigin(n, baseUrl) && !isAssetUrl(n)) out.add(n);
  }
  return [...out];
}

/**
 * Breadth-first crawl from a starting URL.
 * Automatically falls back to headless JS link extraction for client-side rendered SPAs.
 */
async function bfs(start, max, { renderJs = false } = {}) {
  const seen = new Set([start]);
  const queue = [start];
  const discovered = [];

  while (queue.length && discovered.length < max * 2) {
    const url = queue.shift();
    try {
      let links = [];
      const res = await fetch(url, {
        headers: { 'user-agent': 'qaZAR/0.1' },
        signal: AbortSignal.timeout(15000),
      });

      if (res.ok && (res.headers.get('content-type') || '').includes('html')) {
        discovered.push(url);
        const html = await res.text();
        links = extractLinks(html, url);

        // If static extraction found no links on start page, or renderJs requested -> try headless
        if ((renderJs || (url === start && links.length === 0)) && links.length < 3) {
          const jsLinks = await extractLinksHeadless(url).catch(() => []);
          links = [...new Set([...links, ...jsLinks])];
        }
      }

      for (const l of links) {
        if (!seen.has(l)) {
          seen.add(l);
          queue.push(l);
        }
      }
    } catch {
      /* skip unreachable */
    }
  }

  return selectTopRoiCandidates(discovered, max);
}

/**
 * Build the page queue: explicit sitemap -> auto-discovered sitemap -> BFS.
 * Applies ROI ranking to guarantee high-value, diverse UX templates.
 * Returns { urls, source }.
 */
export async function buildQueue({ domain, sitemap_url, max_pages = 10, renderJs = false }) {
  const start = normalizeUrl(domain);
  const candidates = sitemap_url ? [sitemap_url] : await discoverSitemaps(domain);
  const sitemapUrls = [];

  for (const s of candidates) {
    try {
      sitemapUrls.push(...(await collectSitemapUrls(s, max_pages * 2)));
    } catch {
      /* try next */
    }
    if (sitemapUrls.length >= max_pages * 2) break;
  }

  const uniq = [...new Set(sitemapUrls)];
  if (uniq.length) {
    const prioritized = selectTopRoiCandidates(uniq, max_pages);
    return { urls: prioritized, source: 'sitemap' };
  }

  const crawled = await bfs(start, max_pages, { renderJs });
  return { urls: crawled.length ? crawled : [start], source: 'crawl' };
}
