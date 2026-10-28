import { extractPageSeo } from './seo.js';
import { extractLeads, scoreLeadHeat } from './leads.js';
import {
  classifyFunnelUrl, countBlockingHeadScripts, countUnlazyImages, detectTechStack,
} from './techStack.js';
import { headerValue } from './htmlBits.js';
import { pathHasContact, pathHasPricing, scoreSecurity } from './securityScore.js';
import { absorbPageSignal, emptyAggregateProfile, unmeasuredProfile } from './profileAggregate.js';

export function extractCrawlSignals(html = '', url = '', responseTimeMs = 0, headers = null) {
  const getH = (name) => headerValue(headers, name) || null;
  const funnelUrl = classifyFunnelUrl(url);

  const signals = {
    url,
    responseTimeMs,
    htmlSizeBytes: Buffer.byteLength(html, 'utf8'),
    hasViewportMeta: false,
    hasTitle: false,
    hasDescription: false,
    hasOpenGraph: false,
    techStack: detectTechStack(html),
    security: {
      isHttps: url.startsWith('https:'),
      hasHsts: Boolean(getH('strict-transport-security')),
      hasCsp: Boolean(getH('content-security-policy')),
      hasXFrame: Boolean(getH('x-frame-options')),
    },
    performance: {
      compressed: Boolean(getH('content-encoding')),
      unlazyImages: countUnlazyImages(html),
      renderBlockingScripts: countBlockingHeadScripts(html),
      webFonts: (html.match(/fonts\.(?:googleapis|gstatic)\.com|use\.typekit\.net/gi) || []).length,
    },
    funnel: {
      ...funnelUrl,
      hasLeadForm: /<form[^>]*>[\s\S]*?<input[^>]*(?:type=["'](?:email|tel)["']|name=["'](?:email|phone|contact|lead)["'])[\s\S]*?<\/form>/i.test(html),
      insecureForms: (url.startsWith('https:') && /<form[^>]*action=["']http:\/\//i.test(html)) ? 1 : 0,
    },
    contacts: {
      emails: [],
      phones: [],
      socials: [],
    },
    codeHygiene: {
      legacyTags: (html.match(/<(?:center|font|marquee|blink)\b/gi) || []).length,
      missingAltImages: (html.match(/<img(?![^>]*\balt\s*=)[^>]*>/gi) || []).length,
      hasFavicon: /<link\s[^>]*rel\s*=\s*["'](?:shortcut )?icon["']/i.test(html),
    },
  };

  // 1. Meta & SEO hygiene
  signals.hasViewportMeta = /<meta\s[^>]*name\s*=\s*["']viewport["']/i.test(html);
  signals.hasTitle = /<title[^>]*>[\s\S]+?<\/title>/i.test(html);
  signals.hasDescription = /<meta\s[^>]*name\s*=\s*["']description["']/i.test(html);
  signals.hasOpenGraph = /<meta\s[^>]*property\s*=\s*["']og:image["']/i.test(html) && /<meta\s[^>]*property\s*=\s*["']og:title["']/i.test(html);
  signals.hasCanonical = /<link\s[^>]*rel\s*=\s*["']canonical["']/i.test(html);

  const leads = extractLeads(html, url);
  signals.leads = leads;
  signals.contacts.emails = leads.emails;
  signals.contacts.phones = leads.phones;
  signals.contacts.socials = leads.socials;
  signals.seo = extractPageSeo(html, url, headers);

  return signals;
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
