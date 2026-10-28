/** Mutable aggregation shell used while folding per-page crawl signals. */

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
