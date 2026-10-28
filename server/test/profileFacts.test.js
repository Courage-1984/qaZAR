import test from 'node:test';
import assert from 'node:assert/strict';
import { profileFacts } from '../report/profileFacts.js';
import { generateActionRoadmap } from '../report/actionRoadmap.js';

test('profileFacts lists unmeasured placeholders when profile is missing', () => {
  const lines = profileFacts(null);
  assert.ok(lines.some((l) => l.includes('Not measured')));
  assert.ok(lines.some((l) => l.includes('Search tags were not measured')));
});

test('profileFacts states measured response, security, and funnel sightings', () => {
  const lines = profileFacts({
    responseMeasured: true,
    avgResponseTimeMs: 120,
    security: { score: 85 },
    assetHygiene: { measured: true, blockingScriptsTotal: 2, unlazyImagesTotal: 4 },
    codeHygiene: { measured: true, hasFavicon: false },
    socialSharing: { measured: true, hasOpenGraph: true },
    crawlMeta: { hasRobotsTxt: true },
    techStack: ['Shopify'],
    funnel: { hasPricing: true, hasCheckout: false, hasLeadForm: true },
    seo: { issues: [] },
  });
  assert.ok(lines.includes('Response 120 ms'));
  assert.ok(lines.includes('Transport and response headers 85/100'));
  assert.ok(lines.includes('Blocking scripts 2, images without lazy 4'));
  assert.ok(lines.includes('No favicon link was present'));
  assert.ok(lines.includes('Open Graph tags were present'));
  assert.ok(lines.includes('robots.txt was fetched'));
  assert.ok(lines.includes('Stack seen: Shopify'));
  assert.ok(lines.includes('A pricing page was seen.'));
  assert.ok(lines.includes('A form was seen.'));
  assert.equal(lines.some((l) => l.includes('Search tags were not measured')), false);
});

test('generateActionRoadmap pins quick wins, core UX, and strategic lines', () => {
  const map = generateActionRoadmap({
    siteProfile: {
      funnel: { brokenLinks: ['https://x/a'] },
      assetHygiene: { blockingScriptsTotal: 1, unlazyImagesTotal: 5 },
      hasMissingViewportMeta: true,
      crawlMeta: { hasRobotsTxt: false, hasSitemap: false },
      seo: { issues: [{ id: 'seo-missing-title' }] },
      codeHygiene: { measured: true, legacyTagsTotal: 2, missingAltImagesTotal: 0, hasFavicon: true },
      security: { measured: true, score: 60, flags: ['Missing HSTS'] },
    },
  }, { mobileTouch: 3, overflowBreakage: 0, wcagContrast: 1 });
  assert.ok(map.quickWins.some((l) => /broken link/.test(l)));
  assert.ok(map.quickWins.some((l) => /async\/defer/.test(l)));
  assert.ok(map.quickWins.some((l) => /loading="lazy"/.test(l)));
  assert.ok(map.quickWins.some((l) => /viewport meta/.test(l)));
  assert.ok(map.quickWins.some((l) => /robots\.txt/.test(l)));
  assert.ok(map.quickWins.some((l) => /title element/.test(l)));
  assert.ok(map.coreUx.some((l) => /mobile conversion/i.test(l)));
  assert.ok(map.coreUx.some((l) => /WCAG AA/.test(l)));
  assert.ok(map.coreUx.some((l) => /deprecated tag/.test(l)));
  assert.ok(map.strategic.some((l) => /scored 60\/100/.test(l)));
});
