/** Strip nth-of-type noise so repeated selectors cluster together. */
export function normalizeSelector(selector) {
  return String(selector || '')
    .replace(/:nth-of-type\(\d+\)/g, '')
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
  return b.totalOccurrences - a.totalOccurrences;
}

/** Bucket confirmed defects into report categories. */
export function categoryBucket(rule) {
  if (rule === 'target-size-minimum') return 'mobileTouch';
  if (String(rule || '').includes('overflow')) return 'overflowBreakage';
  if (rule === 'wcag-contrast') return 'wcagContrast';
  if (rule === 'element-collision') return 'collisions';
  return null;
}

export function emptyCategories() {
  return { mobileTouch: 0, overflowBreakage: 0, wcagContrast: 0, typography: 0, collisions: 0 };
}
