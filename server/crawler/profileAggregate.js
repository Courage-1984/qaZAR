/** Mutable aggregation shell used while folding per-page crawl signals. */

import {
  absorbContacts, absorbHygieneFunnel, absorbSecurityPerf, absorbSeoSocial,
} from './absorbParts.js';

export function emptyAggregateProfile(brokenLinks = []) {
  return {
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
}

/** Returned when no page signals were collected. */
export function unmeasuredProfile(brokenLinks = []) {
  const profile = emptyAggregateProfile(brokenLinks);
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

/** Fold one page's crawl signals into the mutable aggregate. */
export function absorbPageSignal(profile, s) {
  if (!s.hasViewportMeta) profile.hasMissingViewportMeta = true;
  (s.techStack || []).forEach((t) => profile.detectedTech.add(t));
  absorbContacts(profile, s);
  absorbSeoSocial(profile, s);
  absorbSecurityPerf(profile, s);
  absorbHygieneFunnel(profile, s);
}
