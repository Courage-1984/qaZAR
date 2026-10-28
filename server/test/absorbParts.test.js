import test from 'node:test';
import assert from 'node:assert/strict';
import { emptyAggregateProfile } from '../crawler/profileAggregate.js';
import {
  absorbContacts, absorbHygieneFunnel, absorbSecurityPerf, absorbSeoSocial,
} from '../crawler/absorbParts.js';

test('absorbContacts unions emails phones booking and company', () => {
  const profile = emptyAggregateProfile();
  absorbContacts(profile, {
    contacts: { emails: ['a@b.com'], phones: ['1'], socials: [] },
    leads: { companyName: 'Acme', bookingLinks: ['https://calendly.com/x'], contacts: [{ kind: 'email', value: 'a@b.com' }] },
  });
  assert.ok(profile.leadContacts.emails.has('a@b.com'));
  assert.equal(profile.companyName, 'Acme');
  assert.ok(profile.bookingLinks.has('https://calendly.com/x'));
});

test('absorbSeoSocial and hygiene funnel adjust scores and flags', () => {
  const profile = emptyAggregateProfile();
  absorbSeoSocial(profile, { hasTitle: false, hasDescription: true, hasOpenGraph: true, hasCanonical: true });
  assert.equal(profile.seoScore, 90);
  assert.equal(profile.socialSharing.openGraphPages, 1);
  absorbSecurityPerf(profile, { security: { isHttps: false, hasHsts: true, hasCsp: true }, performance: { compressed: false, unlazyImages: 2, renderBlockingScripts: 1, webFonts: 0 } });
  assert.equal(profile.security.isHttps, false);
  assert.equal(profile.assetHygiene.uncompressedCount, 1);
  absorbHygieneFunnel(profile, { codeHygiene: { legacyTags: 1, missingAltImages: 2, hasFavicon: false }, funnel: { isPricing: true, insecureForms: 1 } });
  assert.equal(profile.funnel.hasPricing, true);
  assert.equal(profile.codeHygiene.hasFavicon, false);
});
