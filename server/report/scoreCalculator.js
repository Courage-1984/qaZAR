/**
 * Calculates executive UX/UI Health Scores and business impact metrics
 * for client-facing audit reports and lead generation.
 */

import { captureCoverage } from './captureCoverage.js';
import { profileFacts } from './profileFacts.js';
import { generateActionRoadmap } from './actionRoadmap.js';
import { materializeClusters, observeViolation } from './clusterFold.js';
import { healthMetricsFromClusters } from './healthMetrics.js';

export { generateActionRoadmap };

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
        observeViolation(map, v, page.url, vp);
      }
    }
  }
  return materializeClusters(map, totalPages);
}

export function calculateHealthScore(run) {
  const clusters = clusterDefects(run);
  const coverage = captureCoverage(run);
  const { metrics, categories } = healthMetricsFromClusters(
    clusters,
    coverage,
    run.pages?.length || 0,
  );
  return {
    metrics,
    clusters,
    omitted: 0,
    facts: profileFacts(run.siteProfile),
    roadmap: generateActionRoadmap(run, categories),
  };
}
