/**
 * Calculates executive UX/UI Health Scores and business impact metrics
 * for client-facing audit reports and lead generation.
 */

/**
 * Clusters recurring violations across pages and viewports to eliminate
 * reporting noise, false duplication, and inflated defect counts.
 */
export function clusterDefects(run) {
  const map = new Map();
  const totalPages = run.pages?.length || 1;

  for (const page of run.pages || []) {
    for (const [vp, rec] of Object.entries(page.viewports || {})) {
      for (const v of rec.violations || []) {
        const normalizedSel = (v.selector || '')
          .replace(/:nth-of-type\(\d+\)/g, '')
          .replace(/\s+/g, ' ')
          .trim();
        const key = `${v.rule}::${v.severity}::${normalizedSel || v.detail || 'unknown'}`;
        let item = map.get(key);
        if (!item) {
          item = {
            rule: v.rule,
            severity: v.severity,
            selector: normalizedSel || v.selector || null,
            detail: v.detail,
            pages: new Set(),
            viewports: new Set(),
            count: 0,
          };
          map.set(key, item);
        }
        item.pages.add(page.url);
        item.viewports.add(vp);
        item.count++;
      }
    }
  }

  const clusters = [...map.values()].map((c) => ({
    rule: c.rule,
    severity: c.severity,
    selector: c.selector,
    detail: c.detail,
    pagesCount: c.pages.size,
    testedPages: totalPages,
    viewports: [...c.viewports],
    totalOccurrences: c.count,
    observed: `observed on ${c.pages.size} of ${totalPages} page(s)`,
  }));

  clusters.sort((a, b) => {
    if (a.severity === 'error' && b.severity !== 'error') return -1;
    if (a.severity !== 'error' && b.severity === 'error') return 1;
    return b.totalOccurrences - a.totalOccurrences;
  });

  return clusters;
}

function coverageOf(run) {
  let attempted = 0;
  let completed = 0;
  let failed = 0;
  let partial = 0;
  const capped = new Set();
  let contrastCapped = false;
  let collisionCapped = false;
  for (const page of run.pages || []) {
    for (const rec of Object.values(page.viewports || {})) {
      if (!rec || rec.status === 'pending') continue;
      attempted += 1;
      if (rec.status === 'error') failed += 1;
      else completed += 1;
      if (rec.partial) partial += 1;
      for (const rule of rec.metrics?.capped || []) capped.add(rule);
      if (rec.metrics?.contrastSampleCapped) contrastCapped = true;
      if (rec.metrics?.collisionSampleCapped) collisionCapped = true;
    }
  }
  const notes = [];
  if (capped.size || contrastCapped || collisionCapped) notes.push('Some counts are capped and are not exhaustive.');
  if (partial) notes.push(`${partial} capture(s) hit the font wait and are partial.`);
  if (run.input?.deterministic === true) notes.push('Deterministic mode injected a frozen clock and a seeded Math.random.');
  return {
    attempted,
    completed,
    failed,
    line: `${completed} of ${attempted} captures completed${failed ? `, ${failed} failed` : ''}. ${notes.join(' ')}`.trim(),
  };
}

export function calculateHealthScore(run) {
  const clusters = clusterDefects(run);
  const confirmed = clusters.filter((c) => c.severity === 'error' || c.severity === 'warn');
  const errorClusters = confirmed.filter((c) => c.severity === 'error');
  const warnClusters = confirmed.filter((c) => c.severity === 'warn');
  const rawErrors = errorClusters.reduce((acc, c) => acc + c.totalOccurrences, 0);
  const rawWarnings = warnClusters.reduce((acc, c) => acc + c.totalOccurrences, 0);
  const categories = { mobileTouch: 0, overflowBreakage: 0, wcagContrast: 0, typography: 0, collisions: 0 };
  for (const c of confirmed) {
    if (c.rule === 'target-size-minimum') categories.mobileTouch += c.totalOccurrences;
    else if (c.rule.includes('overflow')) categories.overflowBreakage += c.totalOccurrences;
    else if (c.rule === 'wcag-contrast') categories.wcagContrast += c.totalOccurrences;
    else if (c.rule === 'element-collision') categories.collisions += c.totalOccurrences;
  }
  const coverage = coverageOf(run);
  return {
    metrics: {
      totalPages: run.pages?.length || 0,
      totalCaptures: coverage.completed,
      attempted: coverage.attempted,
      failedCaptures: coverage.failed,
      coverageLine: coverage.line,
      distinctErrors: errorClusters.length,
      distinctWarnings: warnClusters.length,
      rawErrors,
      rawWarnings,
      categories,
    },
    clusters,
    omitted: 0,
    facts: profileFacts(run.siteProfile),
    roadmap: generateActionRoadmap(run, categories),
  };
}

function profileFacts(profile) {
  if (!profile) {
    return [
      'Response: Not measured',
      'Transport and response headers: Not tested',
      'Assets: Not tested',
      'Favicon: Not tested',
      'Social tags: Not tested',
      'robots.txt: Not tested',
      'Search tags were not measured.',
    ];
  }
  const assets = profile.assetHygiene;
  const code = profile.codeHygiene;
  const social = profile.socialSharing;
  const robots = profile.crawlMeta?.hasRobotsTxt;
  const lines = [
    profile.responseMeasured === true && profile.avgResponseTimeMs != null
      ? `Response ${profile.avgResponseTimeMs} ms`
      : 'Response: Not measured',
    typeof profile.security?.score === 'number'
      ? `Transport and response headers ${profile.security.score}/100`
      : 'Transport and response headers: Not tested',
    assets?.measured === true
      ? `Blocking scripts ${assets.blockingScriptsTotal ?? 0}, images without lazy ${assets.unlazyImagesTotal ?? 0}`
      : 'Assets: Not tested',
    code?.measured !== true ? 'Favicon: Not tested' : (code.hasFavicon ? 'A favicon link was present' : 'No favicon link was present'),
    social?.measured !== true ? 'Social tags: Not tested' : (social.hasOpenGraph ? 'Open Graph tags were present' : 'No Open Graph tags were present'),
    robots == null ? 'robots.txt: Not tested' : (robots ? 'robots.txt was fetched' : 'robots.txt was not found'),
  ];
  if (profile.techStack?.length) lines.push(`Stack seen: ${profile.techStack.join(', ')}`);
  if (profile.funnel?.hasPricing) lines.push('A pricing page was seen.');
  if (profile.funnel?.hasCheckout) lines.push('A checkout page was seen.');
  if (profile.funnel?.hasLeadForm) lines.push('A form was seen.');
  if (!profile.seo) lines.push('Search tags were not measured.');
  return lines;
}

export function generateActionRoadmap(run, categories = {}, clusters = []) {
  const p = run.siteProfile || {};
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
