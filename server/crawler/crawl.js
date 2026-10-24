import { normalizeUrl, isAssetUrl, sameOrigin } from './normalize.js';
import { collectSitemapUrls, discoverSitemaps } from './sitemap.js';
import { extractLinksHeadless } from './headlessCrawl.js';
import { selectTopRoiCandidates } from './roiScorer.js';
import { extractCrawlSignals, aggregateSiteProfile } from './siteProfiler.js';

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
 * Extracts lightweight performance, tech stack, and lead signals on the fly.
 */
async function bfs(start, max, { renderJs = false, onProgress } = {}) {
  const seen = new Set([start]);
  const queue = [start];
  const discovered = [];
  const pageSignals = [];
  onProgress?.('crawling:bfs', `Discovered 1 URL (${start})`);

  while (queue.length && discovered.length < max * 2) {
    const url = queue.shift();
    try {
      let links = [];
      const t0 = performance.now();
      const res = await fetch(url, {
        headers: { 'user-agent': 'qaZAR/0.1' },
        signal: AbortSignal.timeout(15000),
      });
      const elapsed = Math.round(performance.now() - t0);

      if (res.ok && (res.headers.get('content-type') || '').includes('html')) {
        discovered.push(url);
        onProgress?.('crawling:bfs', `Discovered ${discovered.length} pages (${url})`);
        const html = await res.text();
        pageSignals.push(extractCrawlSignals(html, url, elapsed));
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

  onProgress?.('crawling:prioritizing', `Scoring ROI across ${discovered.length} candidates...`);
  const urls = selectTopRoiCandidates(discovered, max);
  onProgress?.('crawling:profiling', `Aggregating site tech & lead profile...`);
  const siteProfile = aggregateSiteProfile(pageSignals);
  return { urls, siteProfile };
}

/**
 * Build the page queue: explicit sitemap -> auto-discovered sitemap -> BFS.
 * Applies ROI ranking and profiles site technical debt and lead intelligence.
 * Returns { urls, source, siteProfile }.
 */
export async function buildQueue({ domain, sitemap_url, max_pages = 10, renderJs = false, onProgress }) {
  const start = normalizeUrl(domain);
  onProgress?.('crawling:sitemap', `Discovering sitemaps for ${domain}...`);
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
    onProgress?.('crawling:prioritizing', `Prioritizing top ${max_pages} ROI URLs from sitemap...`);
    const prioritized = selectTopRoiCandidates(uniq, max_pages);
    onProgress?.('crawling:profiling', `Profiling ${start} infrastructure & leads...`);
    const pageSignals = [];
    try {
      const t0 = performance.now();
      const res = await fetch(start, {
        headers: { 'user-agent': 'qaZAR/0.1' },
        signal: AbortSignal.timeout(10000),
      });
      if (res.ok) {
        const html = await res.text();
        pageSignals.push(extractCrawlSignals(html, start, Math.round(performance.now() - t0)));
      }
    } catch {
      /* skip */
    }
    return { urls: prioritized, source: 'sitemap', siteProfile: aggregateSiteProfile(pageSignals) };
  }

  onProgress?.('crawling:bfs', `Starting BFS discovery crawl on ${start}...`);
  const { urls, siteProfile } = await bfs(start, max_pages, { renderJs, onProgress });
  return { urls: urls.length ? urls : [start], source: 'crawl', siteProfile };
}
