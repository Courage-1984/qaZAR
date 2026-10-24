import fs from 'node:fs';
import path from 'node:path';
import { baselinesDir } from '../config.js';
import { siteHash, slugFor } from '../crawler/normalize.js';

export const baselinePath = (domain, slug, vpName) =>
  path.join(baselinesDir(), siteHash(domain), slug, `${vpName}.png`);

export const hasBaseline = (domain, slug, vpName) => fs.existsSync(baselinePath(domain, slug, vpName));

export function promote(domain, slug, vpName, srcPng) {
  const dest = baselinePath(domain, slug, vpName);
  fs.mkdirSync(path.dirname(dest), { recursive: true });
  fs.copyFileSync(srcPng, dest);
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

export { slugFor };
