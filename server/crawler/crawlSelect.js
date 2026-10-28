/** Pure URL selection helpers used while building the crawl queue. */

import { sameHost } from './normalize.js';
import { isUrlAllowed } from './robots.js';
import { summarizeSeo } from './seo.js';

export function filterAllowedHostUrls(urls, start, robotRules) {
  return [...new Set(urls || [])].filter((u) => sameHost(u, start) && isUrlAllowed(u, robotRules));
}

/** Attach SEO summary for the URLs that will actually be captured. */
export function seoForSelected(pageSignals, selectedUrls, robotRules) {
  const selected = new Set(selectedUrls || []);
  return summarizeSeo(
    (pageSignals || []).filter((s) => selected.has(s.url)).map((s) => s.seo),
    robotRules,
  );
}
