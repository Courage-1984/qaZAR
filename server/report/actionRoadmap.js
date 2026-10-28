/** Suggested next checks from a site profile + confirmed defect categories. */

export function generateActionRoadmap(run, categories = {}, _clusters = []) {
  const p = run?.siteProfile || {};
  const quickWins = [];
  const coreUx = [];
  const strategic = [];

  if (p.funnel?.brokenLinks?.length) quickWins.push(`Repair ${p.funnel.brokenLinks.length} broken link(s).`);
  if (p.assetHygiene?.blockingScriptsTotal > 0) quickWins.push(`Add async/defer to ${p.assetHygiene.blockingScriptsTotal} render-blocking head script(s).`);
  if (p.assetHygiene?.unlazyImagesTotal > 3) quickWins.push(`Add loading="lazy" across ${p.assetHygiene.unlazyImagesTotal} off-screen image(s).`);
  if (p.hasMissingViewportMeta) quickWins.push('Add standard mobile viewport meta tag for responsive scaling.');
  if (p.socialSharing?.measured === true && p.socialSharing.hasOpenGraph === false) quickWins.push('No Open Graph tags were measured on the captured HTML.');
  if (p.codeHygiene?.measured === true && p.codeHygiene.missingAltImagesTotal > 0) quickWins.push(`Add alt text to ${p.codeHygiene.missingAltImagesTotal} image(s).`);
  if (p.codeHygiene?.measured === true && p.codeHygiene.hasFavicon === false) quickWins.push('No favicon was measured on the captured HTML.');
  if (p.crawlMeta && !p.crawlMeta.hasRobotsTxt) quickWins.push('Add standard robots.txt to guide search crawlers and protect server bandwidth.');
  if (p.crawlMeta && !p.crawlMeta.hasSitemap) quickWins.push('Generate and submit XML sitemap (sitemap.xml) for search engine indexing.');
  const seoIds = new Set((p.seo?.issues || []).map((i) => i.id));
  if (seoIds.has('seo-noindex') || seoIds.has('seo-robots-disallow')) quickWins.push('Remove noindex or robots.txt blocks on pages that should appear in search.');
  if (seoIds.has('seo-missing-title')) quickWins.push('Write a unique title element for every page that is missing one.');
  if (seoIds.has('seo-duplicate-title')) quickWins.push('Give each page its own title so search results are not identical.');

  if (categories.mobileTouch > 0) coreUx.push(`${categories.mobileTouch} target(s) are below 24px without a 24px gap. A small target may be difficult to activate. This is not a 48px requirement.`);
  if (categories.overflowBreakage > 0) coreUx.push(`${categories.overflowBreakage} element(s) extend past the viewport and are not clipped by a scroll container.`);
  if (categories.wcagContrast > 0) coreUx.push(`${categories.wcagContrast} measured text block(s) are below the WCAG AA contrast ratio. Image and gradient backgrounds are listed separately as needs review.`);
  if (p.codeHygiene?.measured === true && p.codeHygiene.legacyTagsTotal > 0) coreUx.push(`${p.codeHygiene.legacyTagsTotal} deprecated tag(s) were seen. That is not evidence the site should be rebuilt.`);

  if (p.security?.measured === true && typeof p.security.score === 'number' && p.security.score < 80) {
    strategic.push(`Transport and response headers scored ${p.security.score}/100 (${(p.security.flags || []).join(', ') || 'no flags'}). This is not a full security assessment.`);
  }

  return { quickWins, coreUx, strategic };
}
