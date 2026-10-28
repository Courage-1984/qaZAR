import test from 'node:test';
import assert from 'node:assert/strict';
import {
  absorbPageSignal,
  emptyAggregateProfile,
  unmeasuredProfile,
} from '../crawler/profileAggregate.js';

test('unmeasuredProfile marks security and hygiene as not tested', () => {
  const p = unmeasuredProfile(['https://x/broken']);
  assert.equal(p.responseMeasured, false);
  assert.equal(p.security.measured, false);
  assert.equal(p.seoScore, null);
  assert.deepEqual(p.funnel.brokenLinks, ['https://x/broken']);
});

test('absorbPageSignal unions tech, contacts, and funnel flags', () => {
  const profile = emptyAggregateProfile();
  absorbPageSignal(profile, {
    hasViewportMeta: false,
    hasTitle: false,
    hasDescription: true,
    hasOpenGraph: true,
    hasCanonical: true,
    techStack: ['Shopify'],
    contacts: { emails: ['a@b.com'], phones: [], socials: [] },
    leads: {
      companyName: 'Acme',
      contacts: [{ kind: 'email', value: 'a@b.com' }],
      bookingLinks: ['https://cal.com/acme'],
    },
    security: { isHttps: false, hasHsts: true, hasCsp: true },
    performance: { compressed: false, unlazyImages: 2, renderBlockingScripts: 1, webFonts: 0 },
    codeHygiene: { legacyTags: 1, missingAltImages: 3, hasFavicon: false },
    funnel: { isPricing: true, isCheckout: false, isAuth: false, isContact: false, hasLeadForm: true, insecureForms: 1 },
  });
  assert.equal(profile.hasMissingViewportMeta, true);
  assert.equal(profile.seoScore, 90);
  assert.ok(profile.detectedTech.has('Shopify'));
  assert.ok(profile.leadContacts.emails.has('a@b.com'));
  assert.equal(profile.companyName, 'Acme');
  assert.ok(profile.bookingLinks.has('https://cal.com/acme'));
  assert.equal(profile.security.isHttps, false);
  assert.equal(profile.assetHygiene.uncompressedCount, 1);
  assert.equal(profile.assetHygiene.unlazyImagesTotal, 2);
  assert.equal(profile.codeHygiene.hasFavicon, false);
  assert.equal(profile.funnel.hasPricing, true);
  assert.equal(profile.funnel.hasLeadForm, true);
  assert.equal(profile.funnel.insecureFormsCount, 1);
  assert.equal(profile.socialSharing.openGraphPages, 1);
});
