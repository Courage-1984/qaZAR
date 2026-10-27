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
        const key = `${v.rule}::${normalizedSel || v.detail || 'unknown'}`;
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
    viewports: [...c.viewports],
    totalOccurrences: c.count,
    isGlobal: c.pages.size >= Math.min(2, totalPages) && totalPages > 1,
  }));

  clusters.sort((a, b) => {
    if (a.severity === 'error' && b.severity !== 'error') return -1;
    if (a.severity !== 'error' && b.severity === 'error') return 1;
    return b.totalOccurrences - a.totalOccurrences;
  });

  return clusters;
}

export function calculateHealthScore(run) {
  const clusters = clusterDefects(run);
  const errorClusters = clusters.filter((c) => c.severity === 'error');
  const warnClusters = clusters.filter((c) => c.severity === 'warn');

  let score = 100;
  // Deduct for distinct defect clusters with capped duplicate drag
  score -= errorClusters.length * 6;
  score -= warnClusters.length * 2.5;

  const totalRawErrors = clusters.reduce((acc, c) => c.severity === 'error' ? acc + c.totalOccurrences : acc, 0);
  const totalRawWarns = clusters.reduce((acc, c) => c.severity === 'warn' ? acc + c.totalOccurrences : acc, 0);
  score -= Math.min(10, Math.max(0, totalRawErrors - errorClusters.length) * 0.5);
  score -= Math.min(5, Math.max(0, totalRawWarns - warnClusters.length) * 0.2);
  score -= (run.summary?.changed || 0) * 2;

  const finalScore = Math.max(15, Math.min(100, Math.round(score)));

  let grade = 'F';
  let status = 'Critical UX Debt';
  let recommendation = 'Comprehensive Site Rebuild Recommended';

  if (finalScore >= 90) {
    grade = 'A';
    status = 'Optimal Health';
    recommendation = 'Minor Cosmetic Polish';
  } else if (finalScore >= 80) {
    grade = 'B';
    status = 'Good Responsive Baseline';
    recommendation = 'Targeted Mobile & Accessibility Remediation';
  } else if (finalScore >= 70) {
    grade = 'C';
    status = 'Moderate UX Friction';
    recommendation = 'UX Overhaul for High-Conversion Flows';
  } else if (finalScore >= 60) {
    grade = 'D';
    status = 'Significant Revenue Leakage';
    recommendation = 'Major Responsive Refactor & Architecture Overhaul';
  }

  const categories = {
    mobileTouch: 0,
    overflowBreakage: 0,
    wcagContrast: 0,
    typography: 0,
    collisions: 0,
  };

  for (const c of clusters) {
    if (c.rule.includes('touch')) categories.mobileTouch += c.totalOccurrences;
    else if (c.rule.includes('overflow')) categories.overflowBreakage += c.totalOccurrences;
    else if (c.rule.includes('contrast')) categories.wcagContrast += c.totalOccurrences;
    else if (c.rule.includes('heading') || c.rule.includes('font')) categories.typography += c.totalOccurrences;
    else if (c.rule.includes('collision')) categories.collisions += c.totalOccurrences;
  }

  return {
    score: finalScore,
    grade,
    status,
    recommendation,
    metrics: {
      totalPages: run.pages?.length || 0,
      totalCaptures: (run.pages?.length || 0) * 7,
      distinctErrors: errorClusters.length,
      distinctWarnings: warnClusters.length,
      globalDefects: clusters.filter((c) => c.isGlobal).length,
      rawErrors: totalRawErrors,
      rawWarnings: totalRawWarns,
      categories,
    },
    clusters,
    roiAssessment: estimateRemediationRoi(run, finalScore, errorClusters.length, warnClusters.length, clusters.filter((c) => c.isGlobal).length),
    roadmap: generateActionRoadmap(run, categories, clusters),
  };
}

export function generateActionRoadmap(run, categories = {}, clusters = []) {
  const p = run.siteProfile || {};
  const quickWins = [];
  const coreUx = [];
  const strategic = [];

  if (p.funnel?.brokenLinks?.length) quickWins.push(`Repair ${p.funnel.brokenLinks.length} broken link(s) to protect conversions.`);
  if (p.assetHygiene?.blockingScriptsTotal > 0) quickWins.push(`Add async/defer to ${p.assetHygiene.blockingScriptsTotal} render-blocking head script(s).`);
  if (p.assetHygiene?.unlazyImagesTotal > 3) quickWins.push(`Add loading="lazy" across ${p.assetHygiene.unlazyImagesTotal} off-screen image(s).`);
  if (p.hasMissingViewportMeta) quickWins.push('Add standard mobile viewport meta tag for responsive scaling.');
  if (p.socialSharing && !p.socialSharing.hasOpenGraph) quickWins.push('Add OpenGraph metadata (og:title, og:image) to prevent unbranded links on LinkedIn and Slack.');
  if (p.codeHygiene?.missingAltImagesTotal > 0) quickWins.push(`Add alt text to ${p.codeHygiene.missingAltImagesTotal} image(s) for WCAG accessibility compliance.`);
  if (p.codeHygiene && !p.codeHygiene.hasFavicon) quickWins.push('Add high-resolution favicon and Apple touch icon for branded browser tabs.');
  if (p.crawlMeta && !p.crawlMeta.hasRobotsTxt) quickWins.push('Add standard robots.txt to guide search crawlers and protect server bandwidth.');
  if (p.crawlMeta && !p.crawlMeta.hasSitemap) quickWins.push('Generate and submit XML sitemap (sitemap.xml) for search engine indexing.');
  const seoIds = new Set((p.seo?.issues || []).map((i) => i.id));
  if (seoIds.has('seo-noindex') || seoIds.has('seo-robots-disallow')) quickWins.push('Remove noindex or robots.txt blocks on pages that should appear in search.');
  if (seoIds.has('seo-missing-title')) quickWins.push('Write a unique title element for every page that is missing one.');
  if (seoIds.has('seo-duplicate-title')) quickWins.push('Give each page its own title so search results are not identical.');

  if (categories.mobileTouch > 0) coreUx.push(`Enlarge ${categories.mobileTouch} touch target(s) to meet the 48x48px accessibility minimum.`);
  if (categories.overflowBreakage > 0) coreUx.push(`Constrain ${categories.overflowBreakage} layout element(s) causing horizontal viewport overflow.`);
  if (categories.wcagContrast > 0) coreUx.push(`Adjust colors for ${categories.wcagContrast} text element(s) failing WCAG AA 4.5:1 contrast.`);
  if (p.codeHygiene?.legacyTagsTotal > 0) coreUx.push(`Replace ${p.codeHygiene.legacyTagsTotal} deprecated HTML tag(s) (<center>, <font>) with modern CSS.`);

  const globalCount = clusters.filter((c) => c.isGlobal).length;
  if (globalCount > 0) strategic.push(`Refactor ${globalCount} shared component(s) causing systemic multi-page breakage.`);
  if (p.security?.score < 80) strategic.push(`Harden transport security headers (${(p.security.flags || []).join(', ')}).`);

  return { quickWins, coreUx, strategic };
}

export function estimateRemediationRoi(run, score, distinctErrors, distinctWarnings, globalDefects) {
  const totalPages = run.pages?.length || 1;
  const techStack = run.siteProfile?.techStack || [];
  const hasLegacyDebt = techStack.some((t) => t.includes('Legacy') || t.includes('WordPress')) || Boolean(run.siteProfile?.codeHygiene?.legacyTagsTotal > 0);
  const multiplier = hasLegacyDebt ? 1.25 : 1.0;

  let estimatedHours = 0;
  if (distinctErrors === 0 && distinctWarnings === 0) {
    estimatedHours = 0;
  } else if (score >= 90) {
    estimatedHours = Math.max(1, Math.round(distinctErrors * 1 + distinctWarnings * 0.5));
  } else {
    const baseHours = totalPages === 1 ? 1 : Math.min(3, Math.round(totalPages * 0.4));
    const errorHours = distinctErrors * 1.5;
    const warnHours = distinctWarnings * 0.5;
    estimatedHours = Math.max(1, Math.round((baseHours + errorHours + warnHours) * multiplier));
  }

  let recommendationType = 'patch';
  let recommendationTitle = 'Targeted Responsive Polish';
  let recommendationReason = 'Defects are minor and localized; updating CSS component styles is cost-effective.';

  if (score >= 90 && distinctErrors <= 1) {
    recommendationType = 'polish';
    recommendationTitle = 'Minor Cosmetic Polish';
    recommendationReason = 'Site architecture and responsive layout are in excellent shape. Only minor CSS tweaks needed.';
  } else if (score < 65 || globalDefects >= 3 || (hasLegacyDebt && score < 75)) {
    recommendationType = 'rebuild';
    recommendationTitle = 'Full Modern Rebuild Recommended';
    recommendationReason = 'Defects span global templates and legacy frameworks. A clean responsive rebuild yields higher long-term ROI than recurring CSS patches.';
    estimatedHours = Math.max(25, totalPages * 10);
  } else if (score < 80) {
    recommendationType = 'remediation';
    recommendationTitle = 'Component-Level UX Remediation';
    recommendationReason = 'Moderate responsive and accessibility friction across key templates. Refactoring shared layout components will restore compliance.';
  }

  return {
    estimatedHours,
    recommendationType,
    recommendationTitle,
    recommendationReason,
    hasLegacyDebt,
  };
}
