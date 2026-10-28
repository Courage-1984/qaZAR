import { config } from '../config.js';
import { isAssetUrl, normalizeUrl } from './normalize.js';
import { ensureHttpScheme, pageInputLines } from './pageLines.js';

/**
 * Turn a textarea or string array into unique page URLs on `domain`.
 * Blank lines are ignored. Throws when a line is off-site, not a page, or over the cap.
 */
export function resolveExplicitPages(domain, raw, cap = config.maxPagesCap) {
  const origin = new URL(domain).origin;
  const host = new URL(domain).hostname.toLowerCase();
  const out = [];
  const seen = new Set();
  for (const line of pageInputLines(raw)) {
    const normalized = normalizeUrl(ensureHttpScheme(line), `${origin}/`);
    if (!normalized) throw new Error(`page is not a valid URL: ${line}`);
    const pageHost = new URL(normalized).hostname.toLowerCase();
    if (pageHost !== host) throw new Error(`page must be on ${host}: ${line}`);
    if (isAssetUrl(normalized)) throw new Error(`page looks like a file, not an HTML page: ${line}`);
    if (seen.has(normalized)) continue;
    seen.add(normalized);
    if (out.length >= cap) throw new Error(`pages exceeds the limit of ${cap}`);
    out.push(normalized);
  }
  return out;
}
