import path from 'node:path';
import { storage } from '../storage/storageAdapter.js';
import { siteHash, slugFor } from '../crawler/normalize.js';

export const baselinePath = (domain, slug, vpName, ownerId = 'operator') =>
  storage.getBaselinePath(domain, slug, vpName, ownerId);

export const hasBaseline = (domain, slug, vpName, ownerId = 'operator') =>
  storage.hasBaseline(domain, slug, vpName, ownerId);

export function promote(domain, slug, vpName, srcPng, ownerId = 'operator') {
  return storage.saveBaseline(domain, slug, vpName, srcPng, ownerId);
}

/** Promote screenshots of a run (optionally one page/viewport) to baselines. */
export function promoteRun(run, runDir, { slug, viewport } = {}) {
  const ownerId = run.ownerId || 'operator';
  let n = 0;
  for (const page of run.pages) {
    if (slug && page.slug !== slug) continue;
    for (const [vp, r] of Object.entries(page.viewports)) {
      if (viewport && vp !== viewport) continue;
      if (r.status === 'error' || !r.shot) continue;
      promote(run.input.domain, page.slug, vp, path.join(runDir, r.shot), ownerId);
      r.status = 'baseline-updated';
      n++;
    }
  }
  return n;
}

export { slugFor, siteHash };
