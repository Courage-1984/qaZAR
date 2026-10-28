/**
 * Precision/recall-oriented finding review. Does not invent a replacement score.
 * Auto-triage: confirmed issues stay retained; indeterminate/info start as needs-review.
 * Humans (or later tooling) can mark withdrawn.
 */

const NEEDS_REVIEW_RULES = new Set([
  'wcag-contrast-indeterminate',
  'heading-scale-inverted',
  'heading-scale-static',
  'heading-scale-undersized',
  'touch-target-size',
  'body-font-size',
]);

export function triageViolation(v) {
  if (!v || !v.rule) return 'needs-review';
  if (NEEDS_REVIEW_RULES.has(v.rule) || v.severity === 'info') return 'needs-review';
  return 'retained';
}

export function findingKey(page, viewport, v) {
  return `${page.slug || page.url}|${viewport}|${v.rule}|${v.selector || ''}`;
}

export function countByStatus(findings) {
  const counts = { retained: 0, withdrawn: 0, needsReview: 0 };
  for (const f of findings) {
    if (f.status === 'withdrawn') counts.withdrawn++;
    else if (f.status === 'needs-review') counts.needsReview++;
    else counts.retained++;
  }
  return counts;
}

/** Flatten run violations with a triage status. Optional overrides: { [key]: 'withdrawn'|'retained'|'needs-review' }. */
export function reviewFindings(run, overrides = {}) {
  const findings = [];
  for (const page of run?.pages || []) {
    for (const [viewport, rec] of Object.entries(page.viewports || {})) {
      for (const v of rec.violations || []) {
        const key = findingKey(page, viewport, v);
        const status = overrides[key] || triageViolation(v);
        findings.push({
          key,
          url: page.url,
          slug: page.slug,
          viewport,
          rule: v.rule,
          severity: v.severity,
          selector: v.selector,
          detail: v.detail,
          status,
        });
      }
    }
  }
  return { counts: countByStatus(findings), findings };
}
