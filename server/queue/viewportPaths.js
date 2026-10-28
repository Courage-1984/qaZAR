import path from 'node:path';

/** Relative artifact paths for one page × viewport capture. */
export function viewportShotRels(slug, vpName) {
  return {
    shot: path.join('shots', slug, `${vpName}.png`),
    base: path.join('base', slug, `${vpName}.png`),
    diff: path.join('diffs', slug, `${vpName}.png`),
  };
}

export function asPosixRel(rel) {
  return String(rel || '').replaceAll('\\', '/');
}

/** Capture options derived from run input and viewport. */
export function viewportCaptureOptions(run, vp) {
  return {
    collectLeads: vp.name === 'desktop',
    deterministic: run.input?.deterministic === true,
    fast: Boolean(run.input?.publicCaller),
  };
}

export function emptyViewportRecord() {
  return {
    status: 'pending',
    shot: null,
    base: null,
    diff: null,
    diffPercent: null,
    violations: [],
    metrics: null,
    error: null,
  };
}
