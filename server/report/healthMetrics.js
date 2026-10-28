/** Pure health-score metric folds from defect clusters + capture coverage. */

import { categoryBucket, emptyCategories } from './defectCluster.js';

/**
 * @param {Array<{ severity: string, rule: string, totalOccurrences: number }>} clusters
 * @param {{ completed: number, attempted: number, failed: number, line: string }} coverage
 * @param {number} totalPages
 */
export function healthMetricsFromClusters(clusters = [], coverage, totalPages = 0) {
  const confirmed = clusters.filter((c) => c.severity === 'error' || c.severity === 'warn');
  const errorClusters = confirmed.filter((c) => c.severity === 'error');
  const warnClusters = confirmed.filter((c) => c.severity === 'warn');
  const rawErrors = errorClusters.reduce((acc, c) => acc + c.totalOccurrences, 0);
  const rawWarnings = warnClusters.reduce((acc, c) => acc + c.totalOccurrences, 0);
  const categories = emptyCategories();
  for (const c of confirmed) {
    const bucket = categoryBucket(c.rule);
    if (bucket) categories[bucket] += c.totalOccurrences;
  }
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
    },
    categories,
  };
}
