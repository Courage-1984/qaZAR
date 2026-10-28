import { config } from '../config.js';
import { buildQueue } from '../crawler/crawl.js';
import { VIEWPORTS } from '../engine/capturePage.js';
import { getRun, save } from '../storage/runStore.js';
import { mapPool } from '../util/batch.js';
import { createThrottledWriter } from '../util/throttle.js';
import { finishRun } from './finishRun.js';
import { evaluateCrossViewport, processViewport } from './viewportWork.js';
import {
  captureConcurrency, crawlConcurrency, emptyProgress, seedPages, summarizeRun,
} from './runSummary.js';

export { evaluateCrossViewport };

async function stopped(runId) {
  const current = await getRun(runId);
  return !current || current.status === 'cancelled';
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
      concurrency: crawlConcurrency(run.input, config),
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
    run.pages = seedPages(urls);
    run.progress = emptyProgress(urls.length, VIEWPORTS.length);
    run.status = 'capturing';
    await save(run);
    note(runId, 'capturing', seen);

    const tasks = run.pages.flatMap((page) => VIEWPORTS.map((vp) => ({ page, vp })));
    const remaining = new Map(run.pages.map((page) => [page, VIEWPORTS.length]));
    const persist = runWriter(runId, run);

    await mapPool(tasks, captureConcurrency(run.input, config), async ({ page, vp }) => {
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
    run.summary = summarizeRun(run);
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
