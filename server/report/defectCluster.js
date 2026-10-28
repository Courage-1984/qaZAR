/** Strip selector noise so the same DOM component clusters across viewports. */
export function normalizeSelector(selector) {
  return String(selector || '')
    .replace(/:nth-(?:of-type|child)\(\d+\)/g, '')
    .replace(/\.[\w-]+--[\w-]+/g, '') // transient BEM modifiers
    .replace(/\s+/g, ' ')
    .trim();
}

export function defectClusterKey(v) {
  const sel = normalizeSelector(v?.selector);
  return `${v?.rule}::${v?.severity}::${sel || v?.detail || 'unknown'}`;
}

export function compareClusters(a, b) {
  if (a.severity === 'error' && b.severity !== 'error') return -1;
  if (a.severity !== 'error' && b.severity === 'error') return 1;
  const aComp = a.componentFailures ?? a.pagesCount ?? a.totalOccurrences ?? 0;
  const bComp = b.componentFailures ?? b.pagesCount ?? b.totalOccurrences ?? 0;
  return bComp - aComp || (b.totalOccurrences || 0) - (a.totalOccurrences || 0);
}

/** Bucket confirmed defects into report categories. */
export function categoryBucket(rule) {
  if (rule === 'target-size-minimum') return 'mobileTouch';
  if (String(rule || '').includes('overflow')) return 'overflowBreakage';
  if (rule === 'wcag-contrast') return 'wcagContrast';
  if (rule === 'element-collision') return 'collisions';
  if (rule === 'body-font-size') return 'typography';
  return null;
}

export function emptyCategories() {
  return { mobileTouch: 0, overflowBreakage: 0, wcagContrast: 0, typography: 0, collisions: 0 };
}
