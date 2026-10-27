
import fs from 'node:fs';
import path from 'node:path';
import { config } from '../config.js';
import { buildQueue } from '../crawler/crawl.js';
import { slugFor } from '../crawler/normalize.js';
import { scoreUrl } from '../crawler/roiScorer.js';
import { capturePage, VIEWPORTS } from '../engine/capturePage.js';
import { absorbRendered } from '../crawler/absorb.js';
import { baselinePath, hasBaseline, promote } from '../visual/baseline.js';
import { diffImages } from '../visual/diff.js';
import { getRun, runPath, save } from '../storage/runStore.js';
import { mapPool } from '../util/batch.js';
import { finishRun } from './finishRun.js';

function stopped(runId) {
  const current = getRun(runId);
  return !current || current.status === 'cancelled';
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
        res = await capturePage(page.url, vp, abs, { collectLeads: vp.name === 'desktop' });
      } catch (e) {
        lastErr = e;
      }
    }
    if (!res) throw lastErr;
    if (res.leadHtml && run.siteProfile) {
      absorbRendered(run.siteProfile, res.leadHtml, page.url);
      delete res.leadHtml;
    }
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

export function evaluateCrossViewport(page) {
  const deskRec = page.viewports['desktop'] || page.viewports['fhd'] || page.viewports['ultrawide'];
  const mobRec = page.viewports['mobile'];
  const tabRec = page.viewports['tablet'];
  if (!deskRec?.metrics) return;

  const deskH1 = deskRec.metrics.headings?.h1;
  const deskH2 = deskRec.metrics.headings?.h2;

  if (tabRec?.metrics && deskH1) {
    const tabH1 = tabRec.metrics.headings?.h1;
    if (tabH1 && tabH1 > deskH1 + 4) {
      tabRec.violations = tabRec.violations || [];
      tabRec.violations.push({
        rule: 'heading-scale-inverted',
        severity: 'warn',
        selector: 'h1',
        rect: null,
        detail: `Tablet H1 (${tabH1}px) exceeds desktop H1 (${deskH1}px) indicating breakpoint style inversion`,
      });
    }
  }

  if (mobRec?.metrics) {
    const mobH1 = mobRec.metrics.headings?.h1;
    const mobH2 = mobRec.metrics.headings?.h2;
    const mobBody = mobRec.metrics.bodyFont || 16;

    if (deskH1 && mobH1) {
      if (mobH1 > deskH1 + 4) {
        mobRec.violations.push({
          rule: 'heading-scale-inverted',
          severity: 'warn',
          selector: 'h1',
          rect: null,
          detail: `Mobile H1 (${mobH1}px) exceeds desktop H1 (${deskH1}px) indicating breakpoint style inversion`,
        });
      } else if (deskH1 > 28 && mobH1 >= deskH1) {
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

    if (deskH2 && mobH2 && deskH2 > 24 && mobH2 >= deskH2) {
      mobRec.violations.push({
        rule: 'heading-scale-static',
        severity: 'warn',
        selector: 'h2',
        rect: null,
        detail: `H2 size (${mobH2}px) does not scale down on mobile (390px) from desktop (${deskH2}px)`,
      });
    }
  }
}

export async function processRun(runId) {
  const run = getRun(runId);
  if (!run || run.status === 'cancelled') return;
  try {
    run.status = 'crawling';
    run.crawlStage = 'sitemap';
    save(run);
    const { urls, source, siteProfile } = await buildQueue({
      ...run.input,
      concurrency: run.input?.publicCaller ? 2 : config.crawlConcurrency,
      onProgress: (stage, message) => {
        run.crawlStage = stage;
        run.crawlMessage = message;
        save(run);
      },
    });
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
    save(run);

    const tasks = run.pages.flatMap((page) => VIEWPORTS.map((vp) => ({ page, vp })));
    const remaining = new Map(run.pages.map((page) => [page, VIEWPORTS.length]));
    let writing = Promise.resolve();
    let lastSave = 0;
    let pending = null;
    const persistRun = () => {
      if (stopped(runId)) return;
      const now = Date.now();
      if (now - lastSave < 400) {
        if (!pending) pending = setTimeout(() => { pending = null; persistRun(); }, 400 - (now - lastSave));
        return;
      }
      lastSave = now;
      writing = writing.then(() => {
        if (!stopped(runId)) save(run);
      }).catch((e) => console.error('save failed', e));
    };

    await mapPool(tasks, config.pageConcurrency, async ({ page, vp }) => {
      if (!stopped(runId)) await processViewport(run, page, vp);
      const left = remaining.get(page) - 1;
      remaining.set(page, left);
      if (left === 0) {
        evaluateCrossViewport(page);
        run.progress.pagesDone++;
      }
      run.progress.capturesDone++;
      persistRun();
    });
    if (pending) clearTimeout(pending);
    await writing;

    if (stopped(runId)) return;
    run.summary = summarize(run);
    run.status = 'done';
    run.finishedAt = new Date().toISOString();
    save(run);
    await finishRun(run);
  } catch (e) {
    if (stopped(runId)) return;
    run.status = 'failed';
    run.error = String(e.message || e);
    run.finishedAt = new Date().toISOString();
    save(run);
    throw e;
  }
}
