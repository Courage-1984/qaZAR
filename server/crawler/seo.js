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
import { readSeoJsonLd } from './seoJsonLd.js';
import { linkHref, scanMeta } from './seoMeta.js';

/**
 * @returns {object} per-page search fields
 */
export function extractPageSeo(html = '', url = '', headers = null) {
  const jsonLd = readSeoJsonLd(html);
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
