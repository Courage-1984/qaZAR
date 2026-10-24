import fs from 'node:fs';
import path from 'node:path';
import { config } from '../config.js';
import { buildQueue } from '../crawler/crawl.js';
import { slugFor } from '../crawler/normalize.js';
import { capturePage, VIEWPORTS } from '../engine/capturePage.js';
import { baselinePath, hasBaseline, promote } from '../visual/baseline.js';
import { diffImages } from '../visual/diff.js';
import { getRun, runPath, save } from '../store/runStore.js';

const cancelled = new Set();
export const cancelRun = (id) => cancelled.add(id);

// sequential job queue: one run at a time
let chain = Promise.resolve();
export function enqueue(runId) {
  chain = chain.then(() => processRun(runId)).catch((e) => console.error('run failed', e));
}

async function pool(items, n, fn) {
  const it = items[Symbol.iterator]();
  await Promise.all(
    Array.from({ length: n }, async () => {
      for (let r = it.next(); !r.done; r = it.next()) await fn(r.value);
    }),
  );
}

async function processViewport(run, page, vp) {
  const dir = runPath(run.id);
  const rel = path.join('shots', page.slug, `${vp.name}.png`);
  const abs = path.join(dir, rel);
  const rec = { status: 'pending', shot: null, base: null, diff: null, diffPercent: null, violations: [], metrics: null, error: null };
  page.viewports[vp.name] = rec;
  try {
    let lastErr;
    let res;
    for (let attempt = 0; attempt < 2 && !res; attempt++) {
      try {
        res = await capturePage(page.url, vp, abs);
      } catch (e) {
        lastErr = e;
      }
    }
    if (!res) throw lastErr;
    rec.shot = rel.replaceAll('\\', '/');
    rec.violations = res.violations;
    rec.metrics = res.metrics;

    const domain = run.input.domain;
    if (!hasBaseline(domain, page.slug, vp.name)) {
      promote(domain, page.slug, vp.name, abs); // auto-promote first capture
      rec.status = 'new';
    } else {
      const baseRel = path.join('base', page.slug, `${vp.name}.png`);
      const diffRel = path.join('diffs', page.slug, `${vp.name}.png`);
      fs.mkdirSync(path.dirname(path.join(dir, baseRel)), { recursive: true });
      fs.mkdirSync(path.dirname(path.join(dir, diffRel)), { recursive: true });
      fs.copyFileSync(baselinePath(domain, page.slug, vp.name), path.join(dir, baseRel));
      const d = diffImages(path.join(dir, baseRel), abs, path.join(dir, diffRel));
      rec.base = baseRel.replaceAll('\\', '/');
      rec.diff = diffRel.replaceAll('\\', '/');
      rec.diffPercent = Number(d.diffPercent.toFixed(4));
      rec.sizeChanged = d.sizeChanged;
      rec.status = d.diffPercent >= config.diffThresholdPercent || d.sizeChanged ? 'changed' : 'unchanged';
    }
  } catch (e) {
    rec.status = 'error';
    rec.error = String(e.message || e).split('\n')[0];
  }
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

function evaluateCrossViewport(page) {
  const deskRec = page.viewports['desktop'] || page.viewports['fhd'] || page.viewports['ultrawide'];
  const mobRec = page.viewports['mobile'];
  if (!deskRec?.metrics || !mobRec?.metrics) return;

  const deskH1 = deskRec.metrics.headings?.h1;
  const mobH1 = mobRec.metrics.headings?.h1;
  const mobBody = mobRec.metrics.bodyFont || 16;

  if (deskH1 && mobH1) {
    if (deskH1 > 28 && mobH1 >= deskH1) {
      mobRec.violations.push({
        rule: 'heading-scale-static',
        severity: 'warn',
        selector: 'h1',
        rect: null,
        detail: `H1 size (${mobH1}px) does not scale down on mobile (390px) from desktop (${deskH1}px)`,
      });
    }
    if (mobH1 <= mobBody) {
      mobRec.violations.push({
        rule: 'heading-scale-undersized',
        severity: 'error',
        selector: 'h1',
        rect: null,
        detail: `H1 size (${mobH1}px) is less than or equal to base body font (${mobBody}px) on mobile`,
      });
    }
  }
}

export async function processRun(runId) {
  const run = getRun(runId);
  if (!run || cancelled.has(runId)) return;
  try {
    run.status = 'crawling';
    save(run);
    const { urls, source } = await buildQueue(run.input);
    if (!urls.length) throw new Error('No pages found (sitemap empty and crawl found nothing)');
    run.crawlSource = source;
    run.pages = urls.map((url) => ({ url, slug: slugFor(url), viewports: {} }));
    run.progress = { pagesDone: 0, pagesTotal: urls.length };
    run.status = 'capturing';
    save(run);

    await pool(run.pages, config.pageConcurrency, async (page) => {
      for (const vp of VIEWPORTS) {
        if (cancelled.has(runId)) return;
        await processViewport(run, page, vp);
      }
      evaluateCrossViewport(page);
      run.progress.pagesDone++;
      save(run);
    });

    run.summary = summarize(run);
    run.status = cancelled.has(runId) ? 'cancelled' : 'done';
  } catch (e) {
    run.status = 'failed';
    run.error = String(e.message || e);
  }
  run.finishedAt = new Date().toISOString();
  save(run);
}
