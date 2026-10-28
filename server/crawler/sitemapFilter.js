import { isAssetUrl, normalizeUrl, sameHost } from './normalize.js';

/** True when url is on origin, or when origin is unset. */
export function onHost(url, origin) {
  return !origin || sameHost(url, origin);
}

/** Normalize a sitemap loc; null when empty, asset, or off-host. */
export function acceptSitemapLoc(raw, origin = null) {
  const n = normalizeUrl(String(raw || '').trim());
  if (!n || isAssetUrl(n) || !onHost(n, origin)) return null;
  return n;
}

/** Sitemap URLs declared in robots.txt body (same-host only). */
export function sitemapLocsFromRobots(text, origin) {
  const found = [];
  for (const m of String(text || '').matchAll(/^\s*sitemap:\s*(\S+)/gim)) {
    if (onHost(m[1], origin)) found.push(m[1]);
  }
  return found;
}
