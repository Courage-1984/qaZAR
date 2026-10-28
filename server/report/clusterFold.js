/**
 * Fold raw viewport violations into sorted defect clusters.
 * Same rule + normalised selector across viewports = one component failure.
 */

import { compareClusters, defectClusterKey, normalizeSelector } from './defectCluster.js';
import {
  businessImpact, componentTitle, severityLabel,
} from './componentGroup.js';

export function observeViolation(map, v, pageUrl, vp) {
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
  item.pages.add(pageUrl);
  item.viewports.add(vp);
  item.count++;
  return item;
}

export function materializeClusters(map, totalPages = 1) {
  const clusters = [...map.values()].map((c) => {
    const viewports = [...c.viewports];
    const pagesCount = c.pages.size;
    return {
      rule: c.rule,
      severity: c.severity,
      severityLabel: severityLabel(c.severity),
      selector: c.selector,
      detail: c.detail,
      title: componentTitle(c.rule, c.selector),
      impact: businessImpact(c.rule, c.severity),
      pagesCount,
      testedPages: totalPages,
      viewports,
      viewportHits: viewports.length,
      /** Evidence hits across viewports (debug); not used for scoring. */
      totalOccurrences: c.count,
      /** Always 1 — the component failed; viewport repeats are not extra defects. */
      componentFailures: 1,
      observed: pagesCount === 1
        ? `1 component failure across ${viewports.length} viewport(s)`
        : `1 component failure on ${pagesCount} of ${totalPages} page(s) · ${viewports.length} viewport(s)`,
    };
  });
  clusters.sort(compareClusters);
  return clusters;
}
