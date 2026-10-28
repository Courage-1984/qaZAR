import { normalizeUrl, isAssetUrl, sameOrigin } from './normalize.js';
import { collectSitemapUrls, discoverSitemaps } from './sitemap.js';
import { extractLinksHeadless } from './headlessCrawl.js';
import { selectTopRoiCandidates } from './roiScorer.js';
import { extractCrawlSignals, aggregateSiteProfile } from './siteProfiler.js';
import { parseRobotsTxt, isUrlAllowed } from './robots.js';
import { fetchPublic, fetchPublicText, readCapped } from './safeFetch.js';
import { config } from '../config.js';
import { drainWaves } from '../util/batch.js';
import { waitForHost } from './hostGate.js';
import { emptyCrawlProfile } from './crawlProfile.js';
import { emptyRobotRules, robotsLoadMiss, robotsLoadOk } from './crawlRobots.js';
import { filterAllowedHostUrls, seoForSelected } from './crawlSelect.js';

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
async function bfs(start, max, { renderJs = false, onProgress, robotRules = emptyRobotRules(), concurrency = config.crawlConcurrency } = {}) {
  const seen = new Set([start]);
  const queue = [start];
  const discovered = [];
  const pageSignals = [];
  const brokenLinks = [];
  const limit = max * 2;
  let headlessActive = 0;
  const headlessWait = [];
  onProgress?.('crawling:bfs', `Discovered 1 URL (${start})`);

  const runHeadless = async (url) => {
    if (headlessActive >= 2) await new Promise((resolve) => headlessWait.push(resolve));
    headlessActive++;
    try {
      return await extractLinksHeadless(url).catch(() => []);
    } finally {
      headlessActive--;
      headlessWait.shift()?.();
    }
  };

  await drainWaves(queue, concurrency, async (url) => {
    if (discovered.length >= limit) return;
    const release = await waitForHost(new URL(url).origin, robotRules.crawlDelay || 0);
    try {
      let links = [];
      const t0 = performance.now();
      const res = await fetchPublic(url, { timeout: 15000, label: 'page' });
      const elapsed = Math.round(performance.now() - t0);

      if (res.ok && (res.headers.get('content-type') || '').includes('html')) {
        discovered.push(url);
        onProgress?.('crawling:bfs', `Discovered ${discovered.length} pages (${url})`);
        const html = (await readCapped(res)).toString('utf8');
        pageSignals.push(extractCrawlSignals(html, url, elapsed, res.headers));
        links = extractLinks(html, url);
        if ((renderJs || (url === start && links.length === 0)) && links.length < 3) {
          links = [...new Set([...links, ...(await runHeadless(url))])];
        }
      } else if (!res.ok && res.status >= 400) {
        brokenLinks.push({ url, status: res.status });
      }

      for (const l of links) {
        if (!seen.has(l) && isUrlAllowed(l, robotRules)) {
          seen.add(l);
          queue.push(l);
        }
      }
    } catch {
      /* skip unreachable */
    } finally {
      release();
    }
  }, () => discovered.length < limit);

  onProgress?.('crawling:prioritizing', `Scoring ROI across ${discovered.length} candidates...`);
  const urls = selectTopRoiCandidates(discovered, max);
  onProgress?.('crawling:profiling', `Aggregating site tech & lead profile...`);
  const siteProfile = aggregateSiteProfile(pageSignals, brokenLinks);
  siteProfile.seo = seoForSelected(pageSignals, urls, robotRules);
  return { urls, siteProfile };
}

async function loadRobots(origin) {
  try {
    const { text } = await fetchPublicText(`${origin}/robots.txt`, { timeout: 5000, label: 'robots' });
    return robotsLoadOk(parseRobotsTxt(text));
  } catch {
    return robotsLoadMiss();
  }
}

/**
 * Build the page queue: submitted pages, else sitemap, else BFS.
 * Applies ROI ranking and profiles site technical debt and lead intelligence.
 * Returns { urls, source, siteProfile }.
 */
export async function buildQueue({ domain, sitemap_url, max_pages = 10, renderJs = false, pages = null, onProgress, concurrency = config.crawlConcurrency }) {
  const start = normalizeUrl(domain);
  const origin = new URL(start).origin;
  const { hasRobotsTxt, robotRules } = await loadRobots(origin);

  if (pages?.length) {
    const urls = pages.slice(0, max_pages);
    const noun = urls.length === 1 ? 'page' : 'pages';
    onProgress?.('crawling:pages', `Limiting crawl to ${urls.length} submitted ${noun}`);
    onProgress?.('crawling:profiling', `Contacts will be read during desktop capture of ${urls.length} ${noun}`);
    const crawlMeta = { hasRobotsTxt, hasSitemap: false, explicitPages: true };
    return { urls, source: 'pages', siteProfile: emptyCrawlProfile(crawlMeta) };
  }

  onProgress?.('crawling:sitemap', `Discovering sitemaps for ${domain}...`);
  const candidates = sitemap_url ? [sitemap_url] : await discoverSitemaps(domain);
  const sitemapUrls = [];

  for (const s of candidates) {
    try {
      sitemapUrls.push(...(await collectSitemapUrls(s, max_pages * 2, new Set(), concurrency, origin)));
    } catch {
      /* try next */
    }
    if (sitemapUrls.length >= max_pages * 2) break;
  }

  const uniq = filterAllowedHostUrls(sitemapUrls, start, robotRules);
  if (uniq.length) {
    onProgress?.('crawling:prioritizing', `Prioritizing top ${max_pages} ROI URLs from sitemap...`);
    const prioritized = selectTopRoiCandidates(uniq, max_pages);
    onProgress?.('crawling:profiling', `Contacts will be read during desktop capture`);
    const crawlMeta = { hasRobotsTxt, hasSitemap: true };
    return { urls: prioritized, source: 'sitemap', siteProfile: emptyCrawlProfile(crawlMeta) };
  }

  onProgress?.('crawling:bfs', `Starting BFS discovery crawl on ${start}...`);
  const { urls, siteProfile } = await bfs(start, max_pages, { renderJs, onProgress, robotRules, concurrency });
  siteProfile.crawlMeta = { hasRobotsTxt, hasSitemap: false };
  return { urls: urls.length ? urls : [start], source: 'crawl', siteProfile };
}
