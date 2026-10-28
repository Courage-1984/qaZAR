import path from 'node:path';
import { storage } from '../storage/storageAdapter.js';
import { siteHash, slugFor } from '../crawler/normalize.js';
import { promoteCandidates } from './promoteFilter.js';

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
  for (const { page, vp, rec } of promoteCandidates(run, { slug, viewport })) {
    promote(run.input.domain, page.slug, vp, path.join(runDir, rec.shot), ownerId);
    rec.status = 'baseline-updated';
    n++;
  }
  return n;
}

export { slugFor, siteHash };
