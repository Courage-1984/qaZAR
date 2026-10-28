import test from 'node:test';
import assert from 'node:assert/strict';
import { emptyAggregateProfile } from '../crawler/profileAggregate.js';
import { finalizeSiteProfile, markProfileMeasured } from '../crawler/profileFinalize.js';

test('markProfileMeasured clamps seo and sets social flags', () => {
  const profile = emptyAggregateProfile();
  profile.seoScore = 5;
  profile.socialSharing.openGraphPages = 2;
  profile.socialSharing.canonicalPages = 0;
  markProfileMeasured(profile, 3, 120);
  assert.equal(profile.seoScore, 20);
  assert.equal(profile.avgResponseTimeMs, 120);
  assert.equal(profile.socialSharing.hasOpenGraph, true);
  assert.equal(profile.socialSharing.hasCanonical, false);
  assert.equal(profile.socialSharing.pageCount, 3);
});

test('finalizeSiteProfile exposes leadHeat and measured security', () => {
  const profile = emptyAggregateProfile();
  profile.leadContacts.emails.add('a@b.com');
  markProfileMeasured(profile, 1, 50);
  const out = finalizeSiteProfile(profile, ['https://ex.com/contact']);
  assert.equal(out.responseMeasured, true);
  assert.equal(out.security.measured, true);
  assert.ok(out.leadHeat >= 30);
  assert.deepEqual(out.leadContacts.emails, ['a@b.com']);
  assert.equal(out.funnel.hasContact, true);
});
