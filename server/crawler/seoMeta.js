/** Meta / link tag scans used by on-page SEO extraction. */

import { attr } from './htmlBits.js';

/** Collect robots contents plus first-wins name/property maps. */
export function scanMeta(html) {
  const robots = [];
  const named = {};
  const props = {};
  for (const tag of String(html).matchAll(/<meta\b[^>]*>/gi)) {
    const t = tag[0];
    const content = attr(t, 'content') ?? '';
    const name = (attr(t, 'name') || '').toLowerCase();
    const prop = (attr(t, 'property') || '').toLowerCase();
    if (name === 'robots' || name === 'googlebot') robots.push(content);
    if (name && named[name] == null) named[name] = content;
    if (prop && props[prop] == null) props[prop] = content;
  }
  return { robots, named, props };
}

/** First matching <link rel="…"> href, or null. */
export function linkHref(html, rel) {
  const want = String(rel || '').toLowerCase();
  for (const tag of String(html).matchAll(/<link\b[^>]*>/gi)) {
    const rels = (attr(tag[0], 'rel') || '').toLowerCase().split(/\s+/);
    if (rels.includes(want)) return attr(tag[0], 'href') || '';
  }
  return null;
}
