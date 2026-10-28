/**
 * Pure health-score metric folds from defect clusters + capture coverage.
 * Categories and raw tallies count component failures (clusters), not viewport repeats.
 */

import { categoryBucket, emptyCategories } from './defectCluster.js';
import { scoreFromClusters } from './severityScore.js';

/**
 * @param {Array<{ severity: string, rule: string, totalOccurrences?: number, componentFailures?: number }>} clusters
 * @param {{ completed: number, attempted: number, failed: number, line: string }} coverage
 * @param {number} totalPages
 */
export function healthMetricsFromClusters(clusters = [], coverage, totalPages = 0) {
  const confirmed = clusters.filter((c) => c.severity === 'error' || c.severity === 'warn');
  const errorClusters = confirmed.filter((c) => c.severity === 'error');
  const warnClusters = confirmed.filter((c) => c.severity === 'warn');
  const componentCount = (list) => list.reduce((acc, c) => acc + (c.componentFailures ?? 1), 0);
  const rawErrors = componentCount(errorClusters);
  const rawWarnings = componentCount(warnClusters);
  const categories = emptyCategories();
  for (const c of confirmed) {
    const bucket = categoryBucket(c.rule);
    if (bucket) categories[bucket] += c.componentFailures ?? 1;
  }
  const scored = scoreFromClusters(confirmed);
  return {
    metrics: {
      totalPages,
      totalCaptures: coverage.completed,
      attempted: coverage.attempted,
      failedCaptures: coverage.failed,
      coverageLine: coverage.line,
      distinctErrors: errorClusters.length,
      distinctWarnings: warnClusters.length,
      rawErrors,
      rawWarnings,
      categories,
      score: scored.score,
      grade: scored.grade,
      categoryPenalties: scored.categoryPenalties,
    },
    categories,
    score: scored.score,
    grade: scored.grade,
  };
}
