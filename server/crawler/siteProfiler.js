import { extractPageSeo } from './seo.js';
import { extractLeads, scoreLeadHeat } from './leads.js';
import {
  classifyFunnelUrl, countBlockingHeadScripts, countUnlazyImages, detectTechStack,
} from './techStack.js';
import { headerValue } from './htmlBits.js';
import { pathHasContact, pathHasPricing, scoreSecurity } from './securityScore.js';
import { absorbPageSignal, emptyAggregateProfile, unmeasuredProfile } from './profileAggregate.js';
import {
  codeHygieneOf,
  countWebFonts,
  hasLeadForm,
  insecureFormCount,
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
    performance: {
      compressed: Boolean(getH('content-encoding')),
      unlazyImages: countUnlazyImages(html),
      renderBlockingScripts: countBlockingHeadScripts(html),
      webFonts: countWebFonts(html),
    },
    funnel: {
      ...classifyFunnelUrl(url),
      hasLeadForm: hasLeadForm(html),
      insecureForms: insecureFormCount(url, html),
    },
    contacts: {
      emails: leads.emails,
      phones: leads.phones,
      socials: leads.socials,
    },
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

  if (profile.leadContacts.emails.size > 0 || profile.leadContacts.phones.size > 0 || profile.funnel.hasLeadForm) {
    profile.funnel.hasContact = true;
  }

  const security = scoreSecurity({
    isHttps: profile.security.isHttps,
    hasHsts: profile.security.hasHsts,
    hasCsp: profile.security.hasCsp,
    insecureFormsCount: profile.funnel.insecureFormsCount,
  });

  profile.avgResponseTimeMs = Math.round(totalTime / pageSignals.length);
  profile.responseMeasured = true;
  profile.assetHygiene.measured = true;
  profile.codeHygiene.measured = true;
  profile.socialSharing.measured = true;
  profile.seoScore = Math.max(20, Math.min(100, profile.seoScore));
  profile.socialSharing.hasOpenGraph = profile.socialSharing.openGraphPages > 0;
  profile.socialSharing.hasCanonical = profile.socialSharing.canonicalPages > 0;
  profile.socialSharing.pageCount = pageSignals.length;
  const pages = pageSignals.map((s) => s.url || '');
  const bookingLinks = [...profile.bookingLinks];
  const leadHeat = scoreLeadHeat({
    emails: [...profile.leadContacts.emails],
    phones: [...profile.leadContacts.phones],
    bookingLinks,
    hasLeadForm: profile.funnel.hasLeadForm,
    hasContact: pages.some(pathHasContact),
    hasPricing: profile.funnel.hasPricing || pages.some(pathHasPricing),
  });

  return {
    avgResponseTimeMs: profile.avgResponseTimeMs,
    hasMissingViewportMeta: profile.hasMissingViewportMeta,
    techStack: [...profile.detectedTech],
    leadContacts: {
      emails: [...profile.leadContacts.emails],
      phones: [...profile.leadContacts.phones],
      socials: [...profile.leadContacts.socials],
      contacts: profile.leadContacts.contacts,
    },
    companyName: profile.companyName,
    bookingLinks,
    leadHeat,
    seoScore: profile.seoScore,
    responseMeasured: true,
    security: {
      isHttps: profile.security.isHttps,
      score: security.score,
      flags: security.flags,
      measured: true,
    },
    assetHygiene: profile.assetHygiene,
    codeHygiene: profile.codeHygiene,
    socialSharing: profile.socialSharing,
    funnel: profile.funnel,
  };
}
