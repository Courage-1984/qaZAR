import { extractPageSeo } from './seo.js';
import { extractLeads } from './leads.js';
import { detectTechStack } from './techStack.js';
import { headerValue } from './htmlBits.js';
import { absorbPageSignal, emptyAggregateProfile, unmeasuredProfile } from './profileAggregate.js';
import { finalizeSiteProfile, markProfileMeasured } from './profileFinalize.js';
import { contactsOf, funnelOf, performanceOf } from './signalParts.js';
import {
  codeHygieneOf,
  readPageMeta,
  securityFromUrlHeaders,
} from './pageHygiene.js';

export function extractCrawlSignals(html = '', url = '', responseTimeMs = 0, headers = null) {
  const getH = (name) => headerValue(headers, name) || null;
  const meta = readPageMeta(html);
  const leads = extractLeads(html, url);

  return {
    url,
    responseTimeMs,
    htmlSizeBytes: Buffer.byteLength(html, 'utf8'),
    ...meta,
    techStack: detectTechStack(html),
    security: securityFromUrlHeaders(url, getH),
    performance: performanceOf(html, getH),
    funnel: funnelOf(html, url),
    contacts: contactsOf(leads),
    codeHygiene: codeHygieneOf(html),
    leads,
    seo: extractPageSeo(html, url, headers),
  };
}

export function aggregateSiteProfile(pageSignals = [], brokenLinks = []) {
  if (!pageSignals.length) return unmeasuredProfile(brokenLinks);

  const profile = emptyAggregateProfile(brokenLinks);
  let totalTime = 0;
  for (const s of pageSignals) {
    totalTime += s.responseTimeMs || 0;
    absorbPageSignal(profile, s);
  }

  markProfileMeasured(profile, pageSignals.length, Math.round(totalTime / pageSignals.length));
  return finalizeSiteProfile(profile, pageSignals.map((s) => s.url || ''));
}
