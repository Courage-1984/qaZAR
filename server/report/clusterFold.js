/** Fold raw viewport violations into sorted defect clusters. */

import { compareClusters, defectClusterKey, normalizeSelector } from './defectCluster.js';

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
