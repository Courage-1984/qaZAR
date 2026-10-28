/**
 * On-page SEO from HTML already fetched during crawl.
 * Thresholds follow Google Search Central: titles, snippets, robots meta, canonicals, JSON-LD.
 * Static HTML only — client-rendered tags are invisible here.
 */
import { isUrlAllowed } from './robots.js';
import {
  attr, clipText, decodeEntities, headerValue, isRobotsBlocked, stripBoilerplate,
} from './htmlBits.js';
import {
  canonicalFlags, dupGroups, pageIssues, scoreSeoPages, seoIssue,
} from './seoIssues.js';

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
  const { canonicalRelative, canonicalOffsite } = canonicalFlags(href, url);
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
    for (const p of group) issues.push(seoIssue('seo-duplicate-title', 'warn', p.url, `Title "${shown}" is used on ${group.length} pages.`));
  }
  for (const group of descGroups) {
    const shown = clipText(group[0].description, 70);
    for (const p of group) issues.push(seoIssue('seo-duplicate-description', 'warn', p.url, `Meta description "${shown}" is used on ${group.length} pages.`));
  }

  return {
    score: scoreSeoPages(list, titleGroups.length, descGroups.length),
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
