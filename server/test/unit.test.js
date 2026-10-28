import test from 'node:test';
import assert from 'node:assert/strict';
import { parseSitemapXml } from '../crawler/sitemap.js';
import { normalizeUrl, slugFor } from '../crawler/normalize.js';
import { extractLinks } from '../crawler/crawl.js';
import { VIEWPORTS } from '../engine/viewports.js';

test('parses urlset', () => {
  const r = parseSitemapXml('<urlset><url><loc>https://a.com/x</loc></url><url><loc>https://a.com/y</loc></url></urlset>');
  assert.deepEqual(r.urls, ['https://a.com/x', 'https://a.com/y']);
});

test('parses sitemap index and single-entry urlset', () => {
  assert.deepEqual(parseSitemapXml('<sitemapindex><sitemap><loc>https://a.com/s1.xml</loc></sitemap></sitemapindex>').sitemaps, ['https://a.com/s1.xml']);
  assert.equal(parseSitemapXml('<urlset><url><loc>https://a.com/</loc></url></urlset>').urls.length, 1);
});

test('normalizes urls', () => {
  assert.equal(normalizeUrl('https://a.com/p/?utm_source=x&b=1#frag'), 'https://a.com/p?b=1');
  assert.equal(normalizeUrl('mailto:a@b.c'), null);
});

test('slug unique per query', () => {
  assert.notEqual(slugFor('https://a.com/p?x=1'), slugFor('https://a.com/p?x=2'));
});

test('extractLinks same-origin only, skips assets', () => {
  const html = '<a href="/a">1</a><a href="https://other.com/b">2</a><a href="/img.png">3</a><a href="#top">4</a>';
  assert.deepEqual(extractLinks(html, 'https://a.com/'), ['https://a.com/a']);
});

test('exact 7 viewports', () => {
  assert.equal(VIEWPORTS.length, 7);
  assert.deepEqual(VIEWPORTS.map((v) => v.name), ['ultrawide', 'fhd', 'macbook', 'desktop', 'laptop', 'tablet', 'mobile']);
  assert.deepEqual(VIEWPORTS.filter((v) => v.touch).map((v) => v.name), ['tablet', 'mobile']);
});

test('evaluate is a function suitable for page.evaluate', async () => {
  const { evaluate } = await import('../heuristics/evaluate.js');
  assert.equal(typeof evaluate, 'function');
  // ensure it does not throw reference errors when initialized as string
  assert.ok(evaluate.toString().includes('wcag-contrast'));
  assert.ok(evaluate.toString().includes('element-collision'));
  assert.ok(evaluate.toString().includes('nav-not-collapsed'));
});

test('roiScorer prioritizes high-impact pages over paginated links', async () => {
  const { scoreUrl, selectTopRoiCandidates } = await import('../crawler/roiScorer.js');
  const home = scoreUrl('https://example.com/');
  const pricing = scoreUrl('https://example.com/pricing');
  const pagination = scoreUrl('https://example.com/blog/page/3');

  assert.ok(home.score > pagination.score);
  assert.ok(pricing.score > pagination.score);

  const pool = [
    'https://example.com/blog/post-1',
    'https://example.com/blog/post-2',
    'https://example.com/pricing',
    'https://example.com/login',
    'https://example.com/checkout',
  ];
  const top = selectTopRoiCandidates(pool, 3);
  assert.ok(top.includes('https://example.com/pricing'));
  assert.ok(top.includes('https://example.com/checkout'));
  assert.ok(top.includes('https://example.com/login'));
});

test('robots.txt parser extracts disallows and sitemaps correctly', async () => {
  const { parseRobotsTxt, isUrlAllowed } = await import('../crawler/robots.js');
  const sample = `
User-agent: *
Disallow: /admin/
Disallow: /private/
Crawl-delay: 2
Sitemap: https://example.com/sitemap.xml
`;
  const parsed = parseRobotsTxt(sample);
  assert.deepEqual(parsed.disallows, ['/admin/', '/private/']);
  assert.deepEqual(parsed.sitemaps, ['https://example.com/sitemap.xml']);
  assert.equal(parsed.crawlDelay, 2);
  assert.equal(isUrlAllowed('https://example.com/pricing', parsed.disallows), true);
  assert.equal(isUrlAllowed('https://example.com/admin/settings', parsed.disallows), false);
});

test('calculateHealthScore reports coverage and keeps needs-review out of the contrast tally', async () => {
  const { calculateHealthScore, clusterDefects } = await import('../report/scoreCalculator.js');
  const mockRun = {
    input: { deterministic: true },
    pages: [
      {
        url: 'https://example.com/',
        viewports: {
          mobile: {
            status: 'unchanged',
            partial: true,
            metrics: { capped: ['wcag-contrast'] },
            violations: [
              { rule: 'target-size-minimum', severity: 'warn', selector: 'nav > a', detail: '20px' },
              { rule: 'target-size-minimum', severity: 'error', selector: 'nav > a', detail: '20px' },
            ],
          },
          tablet: { status: 'error', violations: [] },
          desktop: { status: 'pending', violations: [] },
        },
      },
      {
        url: 'https://example.com/pricing',
        viewports: {
          mobile: {
            status: 'unchanged',
            violations: [
              { rule: 'target-size-minimum', severity: 'warn', selector: 'nav > a', detail: '20px' },
              { rule: 'wcag-contrast-indeterminate', severity: 'info', selector: 'p', detail: 'review' },
              { rule: 'wcag-contrast', severity: 'error', selector: 'p', detail: '1.2:1' },
            ],
          },
        },
      },
    ],
  };
  const clusters = clusterDefects(mockRun);
  const warn = clusters.find((c) => c.rule === 'target-size-minimum' && c.severity === 'warn');
  assert.match(warn.observed, /1 component failure/);
  assert.equal(warn.componentFailures, 1);
  assert.equal(warn.isGlobal, undefined);
  assert.equal(clusters.filter((c) => c.rule === 'target-size-minimum').length, 2);
  const result = calculateHealthScore(mockRun);
  assert.equal(typeof result.score, 'number');
  assert.ok(result.grade);
  assert.ok(result.sales);
  assert.equal(result.metrics.categories.wcagContrast, 1);
  assert.equal(result.metrics.totalCaptures, 2);
  assert.match(result.metrics.coverageLine, /2 of 3 captures completed, 1 failed\. Some counts are capped and are not exhaustive\. 1 capture\(s\) hit the font wait and are partial\. Deterministic mode injected a frozen clock/);
  assert.match(result.roadmap.coreUx.join(' '), /mobile conversion/i);
});

test('generateExecutiveReport states measurements and omits unsupported conclusions', async () => {
  const { generateExecutiveReport } = await import('../report/reportGenerator.js');
  const { generatePdfReport } = await import('../report/pdfReport.js');
  const mockRun = {
    id: 'test-run-123',
    createdAt: new Date().toISOString(),
    input: { domain: 'https://client-site.com' },
    pages: [{ url: 'https://client-site.com/', viewports: { mobile: { status: 'unchanged', violations: [] } } }],
    siteProfile: {
      security: { score: 0 },
      leadContacts: { emails: ['ceo@client.com', 'privacy@client.com'], phones: ['+1234567890'], socials: [] },
    },
  };
  const html = generateExecutiveReport(mockRun, 'leads@agency.com', { agency: 'Apex Advisory' });
  const pdf = generatePdfReport(mockRun, 'leads@agency.com', { agency: 'Apex Advisory' });
  for (const bit of ['Apex Advisory', 'ceo@client.com', 'not a sales contact', 'Publicly listed contacts', '0/100', 'Print / Save PDF', 'Copy Summary', 'summary-md', 'mailto:leads@agency.com', '1 of 1 captures completed', 'Health grade']) {
    assert.ok(html.includes(bit), bit);
  }
  assert.ok(pdf.includes('1 of 1 captures completed'));
  assert.match(pdf, /grade/i);
  for (const doc of [html, pdf]) {
    assert.equal(doc.includes('Engineering Remediation'), false);
    assert.equal(doc.includes('Verified Domain Ownership'), false);
    assert.equal(doc.includes('Transport Protected'), false);
    assert.equal(doc.includes('up to 28%'), false);
  }
});

test('extractCrawlSignals detects tech stack, viewport meta, and lead contacts', async () => {
  const { extractCrawlSignals, aggregateSiteProfile } = await import('../crawler/siteProfiler.js');
  const sampleHtml = `
    <html>
      <head>
        <title>Shop Demo</title>
        <meta name="viewport" content="width=device-width, initial-scale=1">
        <meta name="description" content="E-commerce store">
        <script src="https://cdn.shopify.com/s/files/1/theme.js"></script>
        <script src="https://www.googletagmanager.com/gtm.js"></script>
      </head>
      <body>
        <center>Legacy layout</center>
        <img src="product.jpg">
        <form action="https://shop.com/subscribe"><input type="email" name="email"><button>Join</button></form>
        <a href="mailto:founder@shop.com">Contact Us</a>
        <a href="tel:+15551234567">Call Us</a>
        <a href="https://linkedin.com/company/shopdemo">LinkedIn</a>
      </body>
    </html>
  `;
  const mockHeaders = {
    'content-encoding': 'gzip',
    'strict-transport-security': 'max-age=31536000',
    'content-security-policy': "default-src 'self'",
  };
  const signals = extractCrawlSignals(sampleHtml, 'https://shop.com/', 120, mockHeaders);
  assert.equal(signals.hasViewportMeta, true);
  assert.equal(signals.hasTitle, true);
  assert.equal(signals.security.isHttps, true);
  assert.equal(signals.security.hasHsts, true);
  assert.equal(signals.performance.compressed, true);
  assert.equal(signals.performance.renderBlockingScripts, 2);
  assert.equal(signals.codeHygiene.missingAltImages, 1);
  assert.equal(signals.codeHygiene.legacyTags, 1);
  assert.equal(signals.funnel.hasLeadForm, true);
  assert.ok(signals.techStack.includes('Shopify'));
  assert.ok(signals.techStack.includes('Google Analytics/GTM'));
  assert.ok(signals.contacts.emails.includes('founder@shop.com'));
  assert.ok(signals.contacts.phones.includes('+15551234567'));
  assert.ok(signals.contacts.socials.some((s) => s.includes('linkedin.com')));

  const mockBroken = [{ url: 'https://shop.com/broken-page', status: 404 }];
  const profile = aggregateSiteProfile([signals], mockBroken);
  assert.equal(profile.avgResponseTimeMs, 120);
  assert.equal(profile.hasMissingViewportMeta, false);
  assert.equal(profile.security.score, 100);
  assert.equal(profile.assetHygiene.uncompressedCount, 0);
  assert.equal(profile.assetHygiene.blockingScriptsTotal, 2);
  assert.equal(profile.codeHygiene.missingAltImagesTotal, 1);
  assert.equal(profile.codeHygiene.legacyTagsTotal, 1);
  assert.equal(profile.funnel.hasLeadForm, true);
  assert.equal(profile.funnel.hasContact, true);
  assert.equal(profile.funnel.brokenLinks.length, 1);
  assert.equal(profile.funnel.brokenLinks[0].status, 404);
  assert.equal(profile.socialSharing.hasOpenGraph, false);
  assert.equal(profile.socialSharing.hasCanonical, false);
  assert.ok(profile.techStack.includes('Shopify'));
  assert.ok(profile.leadContacts.emails.includes('founder@shop.com'));
});

test('ensurePortFree runs without unhandled errors on any port', async () => {
  const { ensurePortFree } = await import('../freePort.js');
  assert.equal(typeof ensurePortFree, 'function');
  await assert.doesNotReject(async () => {
    await ensurePortFree(59999);
  });
});

test('evaluateCrossViewport detects breakpoint inversions and static scaling', async () => {
  const { evaluateCrossViewport } = await import('../queue/jobQueue.js');
  const mockPage = {
    viewports: {
      desktop: { metrics: { headings: { h1: 32, h2: 26 }, bodyFont: 16 }, violations: [] },
      tablet: { metrics: { headings: { h1: 38 } }, violations: [] },
      mobile: { metrics: { headings: { h1: 40, h2: 26 }, bodyFont: 16 }, violations: [] },
    },
  };
  evaluateCrossViewport(mockPage);
  assert.ok(mockPage.viewports.tablet.violations.some((v) => v.rule === 'heading-scale-inverted'));
  assert.ok(mockPage.viewports.mobile.violations.some((v) => v.rule === 'heading-scale-inverted'));
});



