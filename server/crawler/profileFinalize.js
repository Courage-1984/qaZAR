/** Finalize a mutable aggregate profile into the public siteProfile shape. */

import { pathHasContact, pathHasPricing, scoreSecurity } from './securityScore.js';
import { scoreLeadHeat } from './leadSignals.js';

/** Mark measured flags and clamp SEO / social sharing after absorption. */
export function markProfileMeasured(profile, pageCount, avgResponseTimeMs) {
  profile.avgResponseTimeMs = avgResponseTimeMs;
  profile.responseMeasured = true;
  profile.assetHygiene.measured = true;
  profile.codeHygiene.measured = true;
  profile.socialSharing.measured = true;
  profile.seoScore = Math.max(20, Math.min(100, profile.seoScore));
  profile.socialSharing.hasOpenGraph = profile.socialSharing.openGraphPages > 0;
  profile.socialSharing.hasCanonical = profile.socialSharing.canonicalPages > 0;
  profile.socialSharing.pageCount = pageCount;
  return profile;
}

/** Public siteProfile object from a fully absorbed aggregate. */
export function finalizeSiteProfile(profile, pageUrls = []) {
  if (profile.leadContacts.emails.size > 0 || profile.leadContacts.phones.size > 0 || profile.funnel.hasLeadForm) {
    profile.funnel.hasContact = true;
  }
  const security = scoreSecurity({
    isHttps: profile.security.isHttps,
    hasHsts: profile.security.hasHsts,
    hasCsp: profile.security.hasCsp,
    insecureFormsCount: profile.funnel.insecureFormsCount,
  });
  const bookingLinks = [...profile.bookingLinks];
  const leadHeat = scoreLeadHeat({
    emails: [...profile.leadContacts.emails],
    phones: [...profile.leadContacts.phones],
    bookingLinks,
    hasLeadForm: profile.funnel.hasLeadForm,
    hasContact: pageUrls.some(pathHasContact),
    hasPricing: profile.funnel.hasPricing || pageUrls.some(pathHasPricing),
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
