import test from 'node:test';
import assert from 'node:assert/strict';
import {
  buildSalesCta, estimateEffort, frameworkBloatWarning, heavyStackHits,
} from '../report/rebuildCase.js';

test('frameworkBloatWarning fires for Shopify and WordPress', () => {
  assert.equal(heavyStackHits(['Shopify', 'React']).includes('Shopify'), true);
  assert.match(frameworkBloatWarning(['Shopify']), /Framework bloat/);
  assert.equal(frameworkBloatWarning(['Custom CMS']), null);
});

test('estimateEffort skews remediation above rebuild when debt is high', () => {
  const low = estimateEffort({ distinctErrors: 1, distinctWarnings: 0, techStack: [] });
  const high = estimateEffort({
    distinctErrors: 12,
    distinctWarnings: 6,
    techStack: ['Shopify', 'jQuery (Legacy)'],
    categories: { mobileTouch: 4, wcagContrast: 5, collisions: 3, overflowBreakage: 2 },
    seoScore: 40,
  });
  assert.ok(high.remediateHours > high.rebuildHours);
  assert.equal(high.preferRebuild, true);
  assert.ok(high.remediateHours > low.remediateHours);
});

test('buildSalesCta uses grade and Logi-Ink rebuild language', () => {
  const cta = buildSalesCta({
    grade: 'D', domain: 'ex.com', agency: 'Logi-Ink', preferRebuild: true, techStack: ['WordPress'],
  });
  assert.match(cta.headline, /scored a D/);
  assert.match(cta.headline, /Logi-Ink/);
  assert.match(cta.ctaLabel, /rebuild/i);
  assert.match(decodeURIComponent(cta.mailBody), /ex\.com/);
});
