/** Per-page SEO issue rules and site-level score deductions. */

export const VAGUE_TITLES = new Set(['home', 'index', 'untitled', 'welcome', 'profile']);

export function seoIssue(id, severity, url, detail) {
  return { id, severity, url, detail };
}

export function isVagueTitle(title) {
  return VAGUE_TITLES.has(String(title || '').toLowerCase());
}

export function pageIssues(p) {
  const out = [];
  const url = p.url;
  if (p.disallowed) out.push(seoIssue('seo-robots-disallow', 'error', url, 'robots.txt disallows this URL, so Google may title it from other sites.'));
  if (p.noindex) out.push(seoIssue('seo-noindex', 'error', url, 'noindex or none is set, so this page can be kept out of search results.'));
  if (!p.title) out.push(seoIssue('seo-missing-title', 'error', url, 'Page has no title element.'));
  else if (isVagueTitle(p.title)) out.push(seoIssue('seo-vague-title', 'warn', url, `Title "${p.title}" does not describe the page.`));
  else if (p.titleLength > 60) out.push(seoIssue('seo-title-long', 'info', url, `Title is ${p.titleLength} characters and may be truncated.`));
  if (!p.description) out.push(seoIssue('seo-missing-description', 'warn', url, 'Page has no meta description.'));
  else if (p.descriptionLength > 160) out.push(seoIssue('seo-description-long', 'info', url, `Description is ${p.descriptionLength} characters and may be truncated.`));
  if (!p.h1Count) out.push(seoIssue('seo-missing-h1', 'warn', url, 'Page has no H1. Google may use one when it rewrites the title link.'));
  else if (p.h1Count > 1) out.push(seoIssue('seo-multiple-h1', 'info', url, `Page has ${p.h1Count} H1 elements.`));
  if (!p.canonical) out.push(seoIssue('seo-missing-canonical', 'info', url, 'Page has no canonical link.'));
  else {
    if (p.canonicalRelative) out.push(seoIssue('seo-canonical-relative', 'info', url, 'Canonical URL is not absolute.'));
    if (p.canonicalOffsite) out.push(seoIssue('seo-canonical-offsite', 'info', url, 'Canonical URL points at a different host.'));
  }
  if (p.jsonLdInvalid) out.push(seoIssue('seo-jsonld-invalid', 'warn', url, 'JSON-LD block is not valid JSON.'));
  else if (!p.hasJsonLd) out.push(seoIssue('seo-jsonld-missing', 'info', url, 'Page has no JSON-LD structured data.'));
  if (!p.lang) out.push(seoIssue('seo-missing-lang', 'info', url, 'html element has no lang attribute.'));
  if (!p.hasOg) out.push(seoIssue('seo-missing-og', 'info', url, 'Missing og:title or og:image.'));
  return out;
}

export function normField(s) {
  return String(s || '').toLowerCase().replace(/\s+/g, ' ').trim();
}

export function dupGroups(list, field) {
  const map = new Map();
  for (const p of list) {
    const key = normField(p[field]);
    if (!key) continue;
    const bucket = map.get(key);
    if (bucket) bucket.push(p);
    else map.set(key, [p]);
  }
  return [...map.values()].filter((g) => g.length > 1);
}

/** Deduct from 100 based on blocked pages, missing titles/descriptions, H1s, invalid JSON-LD. */
export function scoreSeoPages(list, titleGroupCount, descGroupCount) {
  let score = 100;
  const blocked = list.filter((p) => p.noindex || p.disallowed).length;
  score -= Math.min(50, blocked * 25);
  score -= list.filter((p) => !p.title).length * 20 + titleGroupCount * 10;
  score -= list.filter((p) => !p.description).length * 8 + descGroupCount * 5;
  score -= list.filter((p) => !p.h1Count).length * 5 + list.filter((p) => p.jsonLdInvalid).length * 8;
  return Math.max(20, Math.min(100, score));
}

export function canonicalFlags(href, pageUrl) {
  if (!href) return { canonicalRelative: false, canonicalOffsite: false };
  const canonicalRelative = !/^https?:\/\//i.test(href);
  let canonicalOffsite = false;
  try {
    canonicalOffsite = new URL(href, pageUrl).host !== new URL(pageUrl).host;
  } catch {
    canonicalOffsite = true;
  }
  return { canonicalRelative, canonicalOffsite };
}
