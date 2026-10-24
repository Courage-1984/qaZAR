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
        const key = `${v.rule}::${v.selector || v.detail || 'unknown'}`;
        let item = map.get(key);
        if (!item) {
          item = {
            rule: v.rule,
            severity: v.severity,
            selector: v.selector || null,
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
  };
}

export function estimateRemediationRoi(run, score, distinctErrors, distinctWarnings, globalDefects) {
  const techStack = run.siteProfile?.techStack || [];
  const hasLegacyDebt = techStack.some((t) => t.includes('Legacy') || t.includes('WordPress'));
  const multiplier = hasLegacyDebt ? 1.3 : 1.0;

  const baseHours = 4;
  const errorHours = distinctErrors * 2.5;
  const warnHours = distinctWarnings * 1.0;
  const estimatedHours = Math.round((baseHours + errorHours + warnHours) * multiplier);

  let recommendationType = 'patch';
  let recommendationTitle = 'Targeted Responsive Remediation';
  let recommendationReason = 'Defects are localized; patching CSS layout and accessibility targets is cost-effective.';

  if (score < 70 || globalDefects >= 2 || (hasLegacyDebt && score < 80)) {
    recommendationType = 'rebuild';
    recommendationTitle = 'Full Modern Rebuild Recommended';
    recommendationReason = 'Defects span global templates and legacy frameworks. A clean responsive rebuild yields higher long-term ROI than recurring CSS patches.';
  }

  return {
    estimatedHours,
    recommendationType,
    recommendationTitle,
    recommendationReason,
    hasLegacyDebt,
  };
}
