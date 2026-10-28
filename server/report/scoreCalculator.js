/**
 * Executive UX health scores and sales-facing impact metrics.
 * Cross-viewport dedupe happens here (not in evaluate.js): each page×viewport
 * capture still runs independently; identical components collapse to one failure.
 */

import { captureCoverage } from './captureCoverage.js';
import { profileFacts } from './profileFacts.js';
import { generateActionRoadmap } from './actionRoadmap.js';
import { materializeClusters, observeViolation } from './clusterFold.js';
import { healthMetricsFromClusters } from './healthMetrics.js';
import {
  estimateEffort, frameworkBloatWarning,
} from './rebuildCase.js';

export { generateActionRoadmap };

/**
 * Clusters recurring violations across pages and viewports so a contrast fail
 * on the same control in seven viewports counts as one component failure.
 */
export function clusterDefects(run) {
  const map = new Map();
  const totalPages = run.pages?.length || 1;
  for (const page of run.pages || []) {
    for (const [vp, rec] of Object.entries(page.viewports || {})) {
      for (const v of rec.violations || []) {
        observeViolation(map, v, page.url, vp);
      }
    }
  }
  return materializeClusters(map, totalPages);
}

export function calculateHealthScore(run) {
  const clusters = clusterDefects(run);
  const coverage = captureCoverage(run);
  const { metrics, categories, score, grade } = healthMetricsFromClusters(
    clusters,
    coverage,
    run.pages?.length || 0,
  );
  const profile = run.siteProfile || {};
  const effort = estimateEffort({
    distinctErrors: metrics.distinctErrors,
    distinctWarnings: metrics.distinctWarnings,
    techStack: profile.techStack || [],
    categories,
    seoScore: profile.seoScore,
  });
  const bloat = frameworkBloatWarning(profile.techStack || []);
  return {
    metrics,
    clusters,
    score,
    grade,
    omitted: 0,
    facts: profileFacts(profile),
    roadmap: generateActionRoadmap(run, categories, clusters),
    sales: {
      ...effort,
      frameworkBloat: bloat,
    },
  };
}
