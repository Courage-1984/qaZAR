import { extractPageSeo } from './seo.js';
import { extractLeads, scoreLeadHeat } from './leads.js';
import {
  classifyFunnelUrl, countBlockingHeadScripts, countUnlazyImages, detectTechStack,
} from './techStack.js';
import { headerValue } from './htmlBits.js';

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
  const profile = {
    avgResponseTimeMs: 0,
    hasMissingViewportMeta: false,
    detectedTech: new Set(),
    leadContacts: { emails: new Set(), phones: new Set(), socials: new Set(), contacts: [] },
    companyName: '',
    bookingLinks: new Set(),
    seoScore: 100,
    security: { isHttps: true, hasHsts: true, hasCsp: true, score: 100, flags: [] },
    assetHygiene: { uncompressedCount: 0, unlazyImagesTotal: 0, blockingScriptsTotal: 0, webFontsTotal: 0 },
    codeHygiene: { legacyTagsTotal: 0, missingAltImagesTotal: 0, hasFavicon: true },
    socialSharing: { hasOpenGraph: true, hasCanonical: true, openGraphPages: 0, canonicalPages: 0, pageCount: 0 },
    funnel: {
      hasPricing: false,
      hasCheckout: false,
      hasAuth: false,
      hasContact: false,
      hasLeadForm: false,
      insecureFormsCount: 0,
      brokenLinks: (brokenLinks || []).slice(0, 5),
    },
  };

  if (!pageSignals.length) {
    profile.avgResponseTimeMs = null;
    profile.responseMeasured = false;
    profile.security = { isHttps: null, score: null, flags: [], measured: false };
    profile.seoScore = null;
    profile.codeHygiene.hasFavicon = null;
    profile.codeHygiene.measured = false;
    profile.assetHygiene.measured = false;
    profile.socialSharing = { hasOpenGraph: null, hasCanonical: null, measured: false };
    return profile;
  }

  let totalTime = 0;
  for (const s of pageSignals) {
    totalTime += s.responseTimeMs || 0;
    if (!s.hasViewportMeta) profile.hasMissingViewportMeta = true;
    (s.techStack || []).forEach((t) => profile.detectedTech.add(t));
    (s.contacts?.emails || []).forEach((e) => profile.leadContacts.emails.add(e));
    (s.contacts?.phones || []).forEach((p) => profile.leadContacts.phones.add(p));
    (s.contacts?.socials || []).forEach((sc) => profile.leadContacts.socials.add(sc));
    for (const contact of s.leads?.contacts || []) {
      if (!profile.leadContacts.contacts.some((c) => c.kind === contact.kind && c.value === contact.value)) {
        profile.leadContacts.contacts.push(contact);
      }
    }
    if (!profile.companyName && s.leads?.companyName) profile.companyName = s.leads.companyName;
    for (const link of s.leads?.bookingLinks || []) profile.bookingLinks.add(link);

    if (!s.hasTitle) profile.seoScore -= 10;
    if (!s.hasDescription) profile.seoScore -= 5;
    if (!s.hasOpenGraph) profile.seoScore -= 5;
    else profile.socialSharing.openGraphPages++;
    if (s.hasCanonical) profile.socialSharing.canonicalPages++;

    if (s.security) {
      if (!s.security.isHttps) profile.security.isHttps = false;
      if (!s.security.hasHsts) profile.security.hasHsts = false;
      if (!s.security.hasCsp) profile.security.hasCsp = false;
    }
    if (s.performance) {
      if (!s.performance.compressed) profile.assetHygiene.uncompressedCount++;
      profile.assetHygiene.unlazyImagesTotal += s.performance.unlazyImages || 0;
      profile.assetHygiene.blockingScriptsTotal += s.performance.renderBlockingScripts || 0;
      profile.assetHygiene.webFontsTotal += s.performance.webFonts || 0;
    }
    if (s.codeHygiene) {
      profile.codeHygiene.legacyTagsTotal += s.codeHygiene.legacyTags || 0;
      profile.codeHygiene.missingAltImagesTotal += s.codeHygiene.missingAltImages || 0;
      if (!s.codeHygiene.hasFavicon) profile.codeHygiene.hasFavicon = false;
    }
    if (s.funnel) {
      if (s.funnel.isPricing) profile.funnel.hasPricing = true;
      if (s.funnel.isCheckout) profile.funnel.hasCheckout = true;
      if (s.funnel.isAuth) profile.funnel.hasAuth = true;
      if (s.funnel.isContact) profile.funnel.hasContact = true;
      if (s.funnel.hasLeadForm) profile.funnel.hasLeadForm = true;
      profile.funnel.insecureFormsCount += s.funnel.insecureForms || 0;
    }
  }

  if (profile.leadContacts.emails.size > 0 || profile.leadContacts.phones.size > 0 || profile.funnel.hasLeadForm) {
    profile.funnel.hasContact = true;
  }

  if (!profile.security.isHttps) { profile.security.score -= 40; profile.security.flags.push('Insecure HTTP'); }
  if (!profile.security.hasHsts) { profile.security.score -= 20; profile.security.flags.push('Missing HSTS'); }
  if (!profile.security.hasCsp) { profile.security.score -= 15; profile.security.flags.push('Missing CSP'); }
  if (profile.funnel.insecureFormsCount > 0) { profile.security.score -= 20; profile.security.flags.push('Insecure Form Submission'); }
  profile.security.score = Math.max(0, profile.security.score);
  profile.security.measured = true;

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
    hasContact: pages.some((p) => /\/(contact|team|book(?:ing)?|demo)\b/i.test(p)),
    hasPricing: profile.funnel.hasPricing || pages.some((p) => /\b(pricing|plans)\b/i.test(p)),
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
      score: profile.security.score,
      flags: profile.security.flags,
      measured: true,
    },
    assetHygiene: profile.assetHygiene,
    codeHygiene: profile.codeHygiene,
    socialSharing: profile.socialSharing,
    funnel: profile.funnel,
  };
}
