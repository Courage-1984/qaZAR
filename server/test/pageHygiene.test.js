import test from 'node:test';
import assert from 'node:assert/strict';
import {
  codeHygieneOf,
  countWebFonts,
  hasLeadForm,
  insecureFormCount,
  readPageMeta,
  securityFromUrlHeaders,
} from '../crawler/pageHygiene.js';
import { emptyCrawlProfile } from '../crawler/crawlProfile.js';

test('readPageMeta and codeHygieneOf pin viewport title og and favicon', () => {
  const html = `<html><head>
    <meta name="viewport" content="width=device-width">
    <title>Hi</title>
    <meta name="description" content="d">
    <meta property="og:title" content="t">
    <meta property="og:image" content="i">
    <link rel="canonical" href="https://x.com/">
    <link rel="icon" href="/f.ico">
    <script src="https://fonts.googleapis.com/css"></script>
  </head><body><center></center><img src="a.png"><img alt="ok" src="b.png">
  <form><input type="email" name="email"></form>
  <form action="http://insecure/x"><input name="x"></form>
  </body></html>`;
  assert.deepEqual(readPageMeta(html), {
    hasViewportMeta: true,
    hasTitle: true,
    hasDescription: true,
    hasOpenGraph: true,
    hasCanonical: true,
  });
  assert.equal(codeHygieneOf(html).legacyTags, 1);
  assert.equal(codeHygieneOf(html).missingAltImages, 1);
  assert.equal(codeHygieneOf(html).hasFavicon, true);
  assert.equal(countWebFonts(html), 1);
  assert.equal(hasLeadForm(html), true);
  assert.equal(insecureFormCount('https://x.com/', html), 1);
  assert.equal(insecureFormCount('http://x.com/', html), 0);
});

test('securityFromUrlHeaders and emptyCrawlProfile', () => {
  const sec = securityFromUrlHeaders('https://x.com', (n) => (
    n === 'strict-transport-security' ? 'max-age=1' : null
  ));
  assert.equal(sec.isHttps, true);
  assert.equal(sec.hasHsts, true);
  assert.equal(sec.hasCsp, false);
  const p = emptyCrawlProfile({ hasRobotsTxt: true, hasSitemap: false });
  assert.equal(p.responseMeasured, false);
  assert.equal(p.security.measured, false);
  assert.equal(p.leadHeat, 0);
  assert.deepEqual(p.crawlMeta, { hasRobotsTxt: true, hasSitemap: false });
});
