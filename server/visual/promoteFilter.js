/** True when a viewport capture can be promoted to baseline. */
export function canPromoteCapture(rec) {
  return Boolean(rec && rec.status !== 'error' && rec.shot);
}

/**
 * Yield { page, vp, rec } entries matching optional slug/viewport filters.
 */
export function* promoteCandidates(run, { slug, viewport } = {}) {
  for (const page of run?.pages || []) {
    if (slug && page.slug !== slug) continue;
    for (const [vp, rec] of Object.entries(page.viewports || {})) {
      if (viewport && vp !== viewport) continue;
      if (!canPromoteCapture(rec)) continue;
      yield { page, vp, rec };
    }
  }
}
