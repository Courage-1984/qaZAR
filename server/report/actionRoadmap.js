/** Suggested next checks from a site profile + confirmed defect categories. */

export function generateActionRoadmap(run, categories = {}, _clusters = []) {
  const p = run?.siteProfile || {};
  const quickWins = [];
  const coreUx = [];
  const strategic = [];

  if (p.funnel?.brokenLinks?.length) quickWins.push(`Repair ${p.funnel.brokenLinks.length} broken link(s).`);
  if (p.assetHygiene?.blockingScriptsTotal > 0) {
    quickWins.push(`Add async/defer to ${p.assetHygiene.blockingScriptsTotal} render-blocking head script(s).`);
  }
  if (p.assetHygiene?.unlazyImagesTotal > 3) {
    quickWins.push(`Add loading="lazy" across ${p.assetHygiene.unlazyImagesTotal} off-screen image(s).`);
  }
  if (p.hasMissingViewportMeta) quickWins.push('Add standard mobile viewport meta tag for responsive scaling.');
  if (p.socialSharing?.measured === true && p.socialSharing.hasOpenGraph === false) {
    quickWins.push('No Open Graph tags were measured on the captured HTML.');
  }
  if (p.codeHygiene?.measured === true && p.codeHygiene.missingAltImagesTotal > 0) {
    quickWins.push(`Add alt text to ${p.codeHygiene.missingAltImagesTotal} image(s).`);
  }
  if (p.codeHygiene?.measured === true && p.codeHygiene.hasFavicon === false) {
    quickWins.push('No favicon was measured on the captured HTML.');
  }
  if (p.crawlMeta && !p.crawlMeta.hasRobotsTxt) {
    quickWins.push('Add standard robots.txt to guide search crawlers and protect server bandwidth.');
  }
  if (p.crawlMeta && !p.crawlMeta.hasSitemap) {
    quickWins.push('Generate and submit XML sitemap (sitemap.xml) for search engine indexing.');
  }
  const seoIds = new Set((p.seo?.issues || []).map((i) => i.id));
  if (seoIds.has('seo-noindex') || seoIds.has('seo-robots-disallow')) {
    quickWins.push('Remove noindex or robots.txt blocks on pages that should appear in search.');
  }
  if (seoIds.has('seo-missing-title')) quickWins.push('Write a unique title element for every page that is missing one.');
  if (seoIds.has('seo-duplicate-title')) quickWins.push('Give each page its own title so search results are not identical.');

  if (categories.mobileTouch > 0) {
    coreUx.push(
      `${categories.mobileTouch} interactive component(s) fail minimum touch sizing. `
      + 'That is lost mobile conversion risk, not a cosmetic lint.',
    );
  }
  if (categories.overflowBreakage > 0) {
    coreUx.push(
      `${categories.overflowBreakage} component(s) overflow the viewport. `
      + 'Prospects read that as an unfinished build.',
    );
  }
  if (categories.wcagContrast > 0) {
    coreUx.push(
      `${categories.wcagContrast} text component(s) fail WCAG AA contrast. `
      + 'Low contrast quietly drops readability and trust on mobile.',
    );
  }
  if (categories.collisions > 0) {
    coreUx.push(
      `${categories.collisions} overlapping control region(s). `
      + 'Mis-taps on checkout or contact controls burn paid traffic.',
    );
  }
  if (p.codeHygiene?.measured === true && p.codeHygiene.legacyTagsTotal > 0) {
    coreUx.push(
      `${p.codeHygiene.legacyTagsTotal} deprecated tag(s) were seen — a smell of accumulated theme debt.`,
    );
  }

  if (p.security?.measured === true && typeof p.security.score === 'number' && p.security.score < 80) {
    strategic.push(
      `Transport and response headers scored ${p.security.score}/100 `
      + `(${(p.security.flags || []).join(', ') || 'no flags'}). This is not a full security assessment.`,
    );
  }
  if ((p.techStack || []).some((t) => /WordPress|Shopify|Webflow|jQuery/i.test(t))) {
    strategic.push(
      'Heavy CMS / builder fingerprints favour a Logi-Ink static rebuild over endless plugin patching '
      + 'when Technical SEO, AEO, and GEO matter to acquisition.',
    );
  }

  return { quickWins, coreUx, strategic };
}
