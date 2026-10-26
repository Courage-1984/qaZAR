import { config } from '../config.js';
import { isAssetUrl, normalizeUrl } from './normalize.js';

/** Give a schemeless host/path an https scheme. Paths and real URLs pass through. */
function withScheme(line) {
  if (/^[a-z][a-z0-9+.-]*:/i.test(line)) return line;
  if (line.startsWith('/') || line.startsWith('?') || line.startsWith('#')) return line;
  if (/^[\w.-]+\.[a-z]{2,}([:/]|$)/i.test(line)) return `https://${line}`;
  return line;
}

/**
 * Turn a textarea or string array into unique page URLs on `domain`.
 * Blank lines are ignored. Throws when a line is off-site, not a page, or over the cap.
 */
export function resolveExplicitPages(domain, raw, cap = config.maxPagesCap) {
  const items = Array.isArray(raw) ? raw : String(raw ?? '').split(/\r?\n/);
  const origin = new URL(domain).origin;
  const host = new URL(domain).hostname.toLowerCase();
  const out = [];
  const seen = new Set();
  for (const item of items) {
    const line = String(item ?? '').trim();
    if (!line || line.startsWith('#')) continue;
    const normalized = normalizeUrl(withScheme(line), `${origin}/`);
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
