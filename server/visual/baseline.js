import path from 'node:path';
import { storage } from '../storage/storageAdapter.js';
import { siteHash, slugFor } from '../crawler/normalize.js';

export const baselinePath = (domain, slug, vpName) =>
  storage.getBaselinePath(domain, slug, vpName);

export const hasBaseline = (domain, slug, vpName) =>
  storage.hasBaseline(domain, slug, vpName);

export function promote(domain, slug, vpName, srcPng) {
  return storage.saveBaseline(domain, slug, vpName, srcPng);
}

/** Promote screenshots of a run (optionally one page/viewport) to baselines. */
export function promoteRun(run, runDir, { slug, viewport } = {}) {
  let n = 0;
  for (const page of run.pages) {
    if (slug && page.slug !== slug) continue;
    for (const [vp, r] of Object.entries(page.viewports)) {
      if (viewport && vp !== viewport) continue;
      if (r.status === 'error' || !r.shot) continue;
      promote(run.input.domain, page.slug, vp, path.join(runDir, r.shot));
      r.status = 'baseline-updated';
      n++;
    }
  }
  return n;
}

export { slugFor, siteHash };
