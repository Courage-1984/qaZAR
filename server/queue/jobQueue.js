import { config } from '../config.js';
import { buildQueue } from '../crawler/crawl.js';
import { slugFor } from '../crawler/normalize.js';
import { scoreUrl } from '../crawler/roiScorer.js';
import { VIEWPORTS } from '../engine/capturePage.js';
import { getRun, save } from '../storage/runStore.js';
import { mapPool } from '../util/batch.js';
import { createThrottledWriter } from '../util/throttle.js';
import { finishRun } from './finishRun.js';
import { evaluateCrossViewport, processViewport } from './viewportWork.js';

export { evaluateCrossViewport };

async function stopped(runId) {
  const current = await getRun(runId);
  return !current || current.status === 'cancelled';
}

function summarize(run) {
  const s = { pages: run.pages.length, captures: 0, errors: 0, changed: 0, new: 0, violations: { error: 0, warn: 0 }, byRule: {} };
  for (const p of run.pages) {
    for (const r of Object.values(p.viewports)) {
      s.captures++;
      if (r.status === 'error') s.errors++;
      if (r.status === 'changed') s.changed++;
      if (r.status === 'new') s.new++;
      for (const v of r.violations) {
        if (v.severity === 'error') s.violations.error++;
        else if (v.severity === 'warn') s.violations.warn++;
        s.byRule[v.rule] = (s.byRule[v.rule] || 0) + 1;
      }
    }
  }
  return s;
}

function note(runId, stage, seen) {
  if (!stage || stage === seen.current) return seen.current;
  seen.current = stage;
  console.log(`qaZAR worker ${runId} ${stage}`);
  return stage;
}

function runWriter(runId, run) {
  return createThrottledWriter(async () => {
    if (!(await stopped(runId))) await save(run);
  });
}

export async function processRun(runId) {
  const run = await getRun(runId);
  if (!run || run.status === 'cancelled') return;
  const seen = { current: '' };
  try {
    run.status = 'crawling';
    run.crawlStage = 'sitemap';
    await save(run);
    note(runId, 'crawling', seen);
    const crawlStarted = Date.now();
    const crawlSave = runWriter(runId, run);
    const { urls, source, siteProfile } = await buildQueue({
      ...run.input,
      concurrency: run.input?.publicCaller ? 2 : config.crawlConcurrency,
      onProgress: (stage, message) => {
        run.crawlStage = stage;
        run.crawlMessage = message;
        crawlSave.schedule();
        note(runId, stage, seen);
      },
    });
    await crawlSave.drain();
    run.crawlMs = Date.now() - crawlStarted;
    await save(run);
    const captureStarted = Date.now();
    if (!urls.length) throw new Error('No pages found (sitemap empty and crawl found nothing)');
    run.crawlSource = source;
    run.siteProfile = siteProfile || null;
    run.pages = urls.map((url) => {
      const scored = scoreUrl(url);
      return {
        url,
        slug: slugFor(url),
        roi: { score: scored.score, label: scored.labels[0] || 'page' },
        viewports: {},
      };
    });
    run.progress = { pagesDone: 0, pagesTotal: urls.length, capturesDone: 0, capturesTotal: urls.length * VIEWPORTS.length };
    run.status = 'capturing';
    await save(run);
    note(runId, 'capturing', seen);

    const tasks = run.pages.flatMap((page) => VIEWPORTS.map((vp) => ({ page, vp })));
    const remaining = new Map(run.pages.map((page) => [page, VIEWPORTS.length]));
    const persist = runWriter(runId, run);

    const concurrency = run.input?.publicCaller
      ? Math.min(config.pageConcurrency, config.publicPageConcurrency || 6)
      : config.pageConcurrency;

    await mapPool(tasks, concurrency, async ({ page, vp }) => {
      if (!(await stopped(runId))) await processViewport(run, page, vp);
      const left = remaining.get(page) - 1;
      remaining.set(page, left);
      if (left === 0) {
        evaluateCrossViewport(page);
        run.progress.pagesDone++;
      }
      run.progress.capturesDone++;
      persist.schedule();
    });
    await persist.drain();

    if (await stopped(runId)) return;
    run.captureMs = Date.now() - captureStarted;
    run.summary = summarize(run);
    run.status = 'done';
    run.finishedAt = new Date().toISOString();
    await save(run);
    note(runId, 'done', seen);
    await finishRun(run);
  } catch (e) {
    if (await stopped(runId)) return;
    note(runId, 'failed', seen);
    run.status = 'failed';
    run.error = String(e.message || e);
    run.finishedAt = new Date().toISOString();
    await save(run);
    throw e;
  }
}
