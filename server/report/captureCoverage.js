/** Aggregate capture completion / cap notes for executive reports. */
export function captureCoverage(run) {
  let attempted = 0;
  let completed = 0;
  let failed = 0;
  let partial = 0;
  const capped = new Set();
  let contrastCapped = false;
  let collisionCapped = false;
  for (const page of run?.pages || []) {
    for (const rec of Object.values(page.viewports || {})) {
      if (!rec || rec.status === 'pending') continue;
      attempted += 1;
      if (rec.status === 'error') failed += 1;
      else completed += 1;
      if (rec.partial) partial += 1;
      for (const rule of rec.metrics?.capped || []) capped.add(rule);
      if (rec.metrics?.contrastSampleCapped) contrastCapped = true;
      if (rec.metrics?.collisionSampleCapped) collisionCapped = true;
    }
  }
  const notes = [];
  if (capped.size || contrastCapped || collisionCapped) {
    notes.push('Some counts are capped and are not exhaustive.');
  }
  if (partial) notes.push(`${partial} capture(s) hit the font wait and are partial.`);
  if (run?.input?.deterministic === true) {
    notes.push('Deterministic mode injected a frozen clock and a seeded Math.random.');
  }
  return {
    attempted,
    completed,
    failed,
    line: `${completed} of ${attempted} captures completed${failed ? `, ${failed} failed` : ''}. ${notes.join(' ')}`.trim(),
  };
}
