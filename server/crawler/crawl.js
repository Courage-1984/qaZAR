import { normalizeUrl, isAssetUrl, sameOrigin } from './normalize.js';
import { collectSitemapUrls, discoverSitemaps } from './sitemap.js';
import { extractLinksHeadless } from './headlessCrawl.js';
import { selectTopRoiCandidates } from './roiScorer.js';
import { extractCrawlSignals, aggregateSiteProfile } from './siteProfiler.js';
import { parseRobotsTxt, isUrlAllowed } from './robots.js';

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
async function bfs(start, max, { renderJs = false, onProgress, disallows = [] } = {}) {
  const seen = new Set([start]);
  const queue = [start];
  const discovered = [];
  const pageSignals = [];
  const brokenLinks = [];
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
        pageSignals.push(extractCrawlSignals(html, url, elapsed, res.headers));
        links = extractLinks(html, url);

        // If static extraction found no links on start page, or renderJs requested -> try headless
        if ((renderJs || (url === start && links.length === 0)) && links.length < 3) {
          const jsLinks = await extractLinksHeadless(url).catch(() => []);
          links = [...new Set([...links, ...jsLinks])];
        }
      } else if (!res.ok && res.status >= 400) {
        brokenLinks.push({ url, status: res.status });
      }

      for (const l of links) {
        if (!seen.has(l) && isUrlAllowed(l, disallows)) {
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
  const siteProfile = aggregateSiteProfile(pageSignals, brokenLinks);
  return { urls, siteProfile };
}

async function profilePage(url) {
  const pageSignals = [];
  try {
    const t0 = performance.now();
    const res = await fetch(url, {
      headers: { 'user-agent': 'qaZAR/0.1' },
      signal: AbortSignal.timeout(10000),
    });
    if (res.ok) {
      const html = await res.text();
      pageSignals.push(extractCrawlSignals(html, url, Math.round(performance.now() - t0), res.headers));
    }
  } catch {
    /* skip unreachable profile target */
  }
  return aggregateSiteProfile(pageSignals);
}

/**
 * Build the page queue: submitted pages, else sitemap, else BFS.
 * Applies ROI ranking and profiles site technical debt and lead intelligence.
 * Returns { urls, source, siteProfile }.
 */
export async function buildQueue({ domain, sitemap_url, max_pages = 10, renderJs = false, pages = null, onProgress }) {
  const start = normalizeUrl(domain);
  if (pages?.length) {
    const urls = pages.slice(0, max_pages);
    const noun = urls.length === 1 ? 'page' : 'pages';
    onProgress?.('crawling:pages', `Limiting crawl to ${urls.length} submitted ${noun}`);
    const siteProfile = await profilePage(urls[0]);
    siteProfile.crawlMeta = { hasRobotsTxt: false, hasSitemap: false, explicitPages: true };
    return { urls, source: 'pages', siteProfile };
  }
  const origin = new URL(start).origin;

  let disallows = [];
  let hasRobotsTxt = false;
  try {
    const robotsRes = await fetch(`${origin}/robots.txt`, {
      headers: { 'user-agent': 'qaZAR/0.1' },
      signal: AbortSignal.timeout(5000),
    });
    if (robotsRes.ok) {
      hasRobotsTxt = true;
      const robotsTxt = await robotsRes.text();
      disallows = parseRobotsTxt(robotsTxt).disallows || [];
    }
  } catch {
    /* no robots.txt */
  }

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

  const uniq = [...new Set(sitemapUrls)].filter((u) => isUrlAllowed(u, disallows));
  if (uniq.length) {
    onProgress?.('crawling:prioritizing', `Prioritizing top ${max_pages} ROI URLs from sitemap...`);
    const prioritized = selectTopRoiCandidates(uniq, max_pages);
    onProgress?.('crawling:profiling', `Profiling ${start} infrastructure & leads...`);
    const siteProfile = await profilePage(start);
    siteProfile.crawlMeta = { hasRobotsTxt, hasSitemap: true };
    return { urls: prioritized, source: 'sitemap', siteProfile };
  }

  onProgress?.('crawling:bfs', `Starting BFS discovery crawl on ${start}...`);
  const { urls, siteProfile } = await bfs(start, max_pages, { renderJs, onProgress, disallows });
  siteProfile.crawlMeta = { hasRobotsTxt, hasSitemap: false };
  return { urls: urls.length ? urls : [start], source: 'crawl', siteProfile };
}
