import { slugFor } from '../crawler/normalize.js';
import { scoreUrl } from '../crawler/roiScorer.js';
import { VIEWPORTS } from '../engine/viewports.js';

/** Aggregate capture/violation counts for a finished run. */
export function summarizeRun(run) {
  const s = {
    pages: run.pages?.length || 0,
    captures: 0,
    errors: 0,
    changed: 0,
    new: 0,
    violations: { error: 0, warn: 0 },
    byRule: {},
  };
  for (const p of run.pages || []) {
    for (const r of Object.values(p.viewports || {})) {
      s.captures++;
      if (r.status === 'error') s.errors++;
      if (r.status === 'changed') s.changed++;
      if (r.status === 'new') s.new++;
      for (const v of r.violations || []) {
        if (v.severity === 'error') s.violations.error++;
        else if (v.severity === 'warn') s.violations.warn++;
        s.byRule[v.rule] = (s.byRule[v.rule] || 0) + 1;
      }
    }
  }
  return s;
}

/** Seed page records after crawl discovery. */
export function seedPages(urls = []) {
  return urls.map((url) => {
    const scored = scoreUrl(url);
    return {
      url,
      slug: slugFor(url),
      roi: { score: scored.score, label: scored.labels[0] || 'page' },
      viewports: {},
    };
  });
}

export function emptyProgress(pageCount, viewportCount = VIEWPORTS.length) {
  return {
    pagesDone: 0,
    pagesTotal: pageCount,
    capturesDone: 0,
    capturesTotal: pageCount * viewportCount,
  };
}

/** Public callers are capped; operators use full pageConcurrency. */
export function captureConcurrency(input, config) {
  if (input?.publicCaller) {
    return Math.min(config.pageConcurrency, config.publicPageConcurrency || 6);
  }
  return config.pageConcurrency;
}

export function crawlConcurrency(input, config) {
  return input?.publicCaller ? 2 : config.crawlConcurrency;
}
