/** Shared date / timing / download-name bits for HTML and PDF reports. */

export function reportDate(createdAt, now = Date.now()) {
  return new Date(createdAt || now).toLocaleDateString('en-GB', {
    day: 'numeric', month: 'short', year: 'numeric',
  });
}

export function reportTimingLine(run) {
  return [
    run?.crawlMs != null ? `Discovery ${run.crawlMs} ms` : '',
    run?.captureMs != null ? `Capture ${run.captureMs} ms` : '',
  ].filter(Boolean).join('. ');
}

export function reportDomain(run) {
  return run?.input?.domain || 'Unknown domain';
}

/** Safe attachment basename for HTML download. */
export function reportDownloadName(run) {
  const raw = run?.input?.domain?.replace(/https?:\/\//, '').replace(/[^a-zA-Z0-9.-]/g, '_');
  return `qaZAR-audit-${raw || run?.id || 'report'}.html`;
}

export function flattenRoadmap(roadmap) {
  return [
    ...(roadmap?.quickWins || []),
    ...(roadmap?.coreUx || []),
    ...(roadmap?.strategic || []),
  ];
}

/** Per-viewport error/warn tallies for PDF tables (skips pending/error captures). */
export function viewportViolationTallies(pages, names = [
  'ultrawide', 'fhd', 'macbook', 'desktop', 'laptop', 'tablet', 'mobile',
]) {
  return names.map((name) => {
    let errors = 0;
    let warns = 0;
    for (const page of pages || []) {
      const rec = page.viewports?.[name];
      if (!rec || rec.status === 'pending' || rec.status === 'error') continue;
      for (const item of rec.violations || []) {
        if (item.severity === 'error') errors += 1;
        else if (item.severity === 'warn') warns += 1;
      }
    }
    return { name, errors, warns };
  });
}
