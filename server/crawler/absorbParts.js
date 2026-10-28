/** Fold slices of one page signal into a mutable aggregate profile. */

export function absorbContacts(profile, s) {
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
}

export function absorbSeoSocial(profile, s) {
  if (!s.hasTitle) profile.seoScore -= 10;
  if (!s.hasDescription) profile.seoScore -= 5;
  if (!s.hasOpenGraph) profile.seoScore -= 5;
  else profile.socialSharing.openGraphPages++;
  if (s.hasCanonical) profile.socialSharing.canonicalPages++;
}

export function absorbSecurityPerf(profile, s) {
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
}

export function absorbHygieneFunnel(profile, s) {
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
