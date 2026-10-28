/**
 * Calculates executive UX/UI Health Scores and business impact metrics
 * for client-facing audit reports and lead generation.
 */

import { captureCoverage } from './captureCoverage.js';
import {
  categoryBucket, compareClusters, defectClusterKey, emptyCategories, normalizeSelector,
} from './defectCluster.js';
import { profileFacts } from './profileFacts.js';
import { generateActionRoadmap } from './actionRoadmap.js';

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
        const key = defectClusterKey(v);
        let item = map.get(key);
        if (!item) {
          const normalizedSel = normalizeSelector(v.selector);
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

  clusters.sort(compareClusters);
  return clusters;
}

export function calculateHealthScore(run) {
  const clusters = clusterDefects(run);
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
  const coverage = captureCoverage(run);
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
