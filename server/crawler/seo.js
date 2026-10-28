/**
 * On-page SEO from HTML already fetched during crawl.
 * Thresholds follow Google Search Central: titles, snippets, robots meta, canonicals, JSON-LD.
 * Static HTML only — client-rendered tags are invisible here.
 */
import { isUrlAllowed } from './robots.js';
import {
  attr, clipText, decodeEntities, headerValue, isRobotsBlocked, stripBoilerplate,
} from './htmlBits.js';

const VAGUE = new Set(['home', 'index', 'untitled', 'welcome', 'profile']);

function scanMeta(html) {
  const robots = [];
  const named = {};
  const props = {};
  for (const tag of html.matchAll(/<meta\b[^>]*>/gi)) {
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

function linkHref(html, rel) {
  for (const tag of html.matchAll(/<link\b[^>]*>/gi)) {
    const rels = (attr(tag[0], 'rel') || '').toLowerCase().split(/\s+/);
    if (rels.includes(rel)) return attr(tag[0], 'href') || '';
  }
  return null;
}

function collectTypes(node, out) {
  if (!node || typeof node !== 'object') return;
  if (Array.isArray(node)) {
    for (const item of node) collectTypes(item, out);
    return;
  }
  const t = node['@type'];
  if (typeof t === 'string') out.push(t);
  else if (Array.isArray(t)) for (const item of t) if (typeof item === 'string') out.push(item);
  if (node['@graph']) collectTypes(node['@graph'], out);
}

function readJsonLd(html) {
  const types = [];
  let blocks = 0;
  let invalid = false;
  const re = /<script\b[^>]*type\s*=\s*["']application\/ld\+json["'][^>]*>([\s\S]*?)<\/script>/gi;
  for (const m of String(html).matchAll(re)) {
    blocks++;
    try {
      collectTypes(JSON.parse(m[1]), types);
    } catch {
      invalid = true;
    }
  }
  return { blocks, invalid, types: [...new Set(types)].slice(0, 8) };
}

function issue(id, severity, url, detail) {
  return { id, severity, url, detail };
}

/**
 * @returns {object} per-page search fields
 */
export function extractPageSeo(html = '', url = '', headers = null) {
  const jsonLd = readJsonLd(html);
  const doc = stripBoilerplate(html);
  const { robots, named, props } = scanMeta(doc);
  const title = decodeEntities((doc.match(/<title[^>]*>([\s\S]*?)<\/title>/i) || [])[1] || '');
  const description = decodeEntities(named.description || '');
  const href = linkHref(doc, 'canonical');
  let canonicalRelative = false;
  let canonicalOffsite = false;
  if (href) {
    canonicalRelative = !/^https?:\/\//i.test(href);
    try {
      canonicalOffsite = new URL(href, url).host !== new URL(url).host;
    } catch {
      canonicalOffsite = true;
    }
  }
  const ogTitle = decodeEntities(props['og:title'] || '');
  const ogImage = (props['og:image'] || '').trim();
  const h1Count = (doc.match(/<h1\b/gi) || []).length;
  return {
    url,
    title,
    description,
    titleLength: title.length,
    descriptionLength: description.length,
    h1Count,
    noindex: isRobotsBlocked([...robots, headerValue(headers, 'x-robots-tag')]),
    lang: attr((doc.match(/<html\b[^>]*>/i) || [''])[0], 'lang') || '',
    hasOg: Boolean(ogTitle && ogImage),
    canonical: href,
    canonicalRelative,
    canonicalOffsite,
    jsonLdInvalid: jsonLd.invalid,
    jsonLdTypes: jsonLd.types,
    hasJsonLd: jsonLd.blocks > 0,
  };
}

function norm(s) {
  return String(s || '').toLowerCase().replace(/\s+/g, ' ').trim();
}

function dupGroups(list, field) {
  const map = new Map();
  for (const p of list) {
    const key = norm(p[field]);
    if (!key) continue;
    const bucket = map.get(key);
    if (bucket) bucket.push(p);
    else map.set(key, [p]);
  }
  return [...map.values()].filter((g) => g.length > 1);
}

function pageIssues(p) {
  const out = [];
  if (p.disallowed) out.push(issue('seo-robots-disallow', 'error', p.url, 'robots.txt disallows this URL, so Google may title it from other sites.'));
  if (p.noindex) out.push(issue('seo-noindex', 'error', p.url, 'noindex or none is set, so this page can be kept out of search results.'));
  if (!p.title) out.push(issue('seo-missing-title', 'error', p.url, 'Page has no title element.'));
  else if (VAGUE.has(p.title.toLowerCase())) out.push(issue('seo-vague-title', 'warn', p.url, `Title "${p.title}" does not describe the page.`));
  else if (p.titleLength > 60) out.push(issue('seo-title-long', 'info', p.url, `Title is ${p.titleLength} characters and may be truncated.`));
  if (!p.description) out.push(issue('seo-missing-description', 'warn', p.url, 'Page has no meta description.'));
  else if (p.descriptionLength > 160) out.push(issue('seo-description-long', 'info', p.url, `Description is ${p.descriptionLength} characters and may be truncated.`));
  if (!p.h1Count) out.push(issue('seo-missing-h1', 'warn', p.url, 'Page has no H1. Google may use one when it rewrites the title link.'));
  else if (p.h1Count > 1) out.push(issue('seo-multiple-h1', 'info', p.url, `Page has ${p.h1Count} H1 elements.`));
  if (!p.canonical) out.push(issue('seo-missing-canonical', 'info', p.url, 'Page has no canonical link.'));
  else {
    if (p.canonicalRelative) out.push(issue('seo-canonical-relative', 'info', p.url, 'Canonical URL is not absolute.'));
    if (p.canonicalOffsite) out.push(issue('seo-canonical-offsite', 'info', p.url, 'Canonical URL points at a different host.'));
  }
  if (p.jsonLdInvalid) out.push(issue('seo-jsonld-invalid', 'warn', p.url, 'JSON-LD block is not valid JSON.'));
  else if (!p.hasJsonLd) out.push(issue('seo-jsonld-missing', 'info', p.url, 'Page has no JSON-LD structured data.'));
  if (!p.lang) out.push(issue('seo-missing-lang', 'info', p.url, 'html element has no lang attribute.'));
  if (!p.hasOg) out.push(issue('seo-missing-og', 'info', p.url, 'Missing og:title or og:image.'));
  return out;
}

/**
 * Score and list issues for the pages that will be captured.
 * robotRules is { disallows, allows } from parseRobotsTxt. Null skips the disallow check.
 */
export function summarizeSeo(pages = [], robotRules = null) {
  const list = [];
  for (const page of pages) {
    if (!page?.url) continue;
    const disallowed = Boolean(robotRules) && !isUrlAllowed(page.url, robotRules);
    list.push({ ...page, disallowed, indexable: !page.noindex && !disallowed });
  }

  const issues = list.flatMap(pageIssues);
  const titleGroups = dupGroups(list, 'title');
  const descGroups = dupGroups(list, 'description');
  for (const group of titleGroups) {
    const shown = clipText(group[0].title, 70);
    for (const p of group) issues.push(issue('seo-duplicate-title', 'warn', p.url, `Title "${shown}" is used on ${group.length} pages.`));
  }
  for (const group of descGroups) {
    const shown = clipText(group[0].description, 70);
    for (const p of group) issues.push(issue('seo-duplicate-description', 'warn', p.url, `Meta description "${shown}" is used on ${group.length} pages.`));
  }

  let score = 100;
  const blocked = list.filter((p) => p.noindex || p.disallowed).length;
  score -= Math.min(50, blocked * 25);
  score -= list.filter((p) => !p.title).length * 20 + titleGroups.length * 10;
  score -= list.filter((p) => !p.description).length * 8 + descGroups.length * 5;
  score -= list.filter((p) => !p.h1Count).length * 5 + list.filter((p) => p.jsonLdInvalid).length * 8;
  score = Math.max(20, Math.min(100, score));

  return {
    score,
    issues,
    pages: list.map((p) => ({
      url: p.url,
      title: clipText(p.title, 120),
      descriptionLength: p.descriptionLength || 0,
      indexable: p.indexable,
      h1Count: p.h1Count,
    })),
  };
}
