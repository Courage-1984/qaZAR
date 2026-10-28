import fs from 'node:fs';
import path from 'node:path';
import { config } from '../config.js';
import { capturePage } from '../engine/capturePage.js';
import { absorbRendered } from '../crawler/absorb.js';
import { baselinePath, hasBaseline, promote } from '../visual/baseline.js';
import { diffImages } from '../visual/diff.js';
import { captureDiffStatus } from '../visual/diffMetrics.js';
import { runPath } from '../storage/runStore.js';
import { siteHash, storage } from '../storage/storageAdapter.js';
import { touchBaseline } from '../storage/db.js';
import { firstLine } from '../util/firstLine.js';
import { crossViewportViolations } from './crossViewport.js';
import {
  asPosixRel, emptyViewportRecord, viewportCaptureOptions, viewportShotRels,
} from './viewportPaths.js';

export async function processViewport(run, page, vp) {
  const dir = runPath(run.id);
  const rels = viewportShotRels(page.slug, vp.name);
  const abs = path.join(dir, rels.shot);
  const rec = emptyViewportRecord();
  page.viewports[vp.name] = rec;
  try {
    let lastErr;
    let res;
    for (let attempt = 0; attempt < 2 && !res; attempt++) {
      try {
        res = await capturePage(page.url, vp, abs, viewportCaptureOptions(run, vp));
      } catch (e) {
        lastErr = e;
      }
    }
    if (!res) throw lastErr;
    if (res.leadHtml && run.siteProfile) {
      absorbRendered(run.siteProfile, res.leadHtml, page.url);
      delete res.leadHtml;
    }
    if (res.timings) {
      const m = res.timings;
      console.log(`qaZAR viewport ${vp.name} goto=${m.gotoMs} idle=${m.idleMs} scroll=${m.scrollMs} fonts=${m.fontMs} shot=${m.shotMs}`);
      delete res.timings;
    }
    rec.shot = asPosixRel(rels.shot);
    rec.violations = res.violations;
    rec.metrics = res.metrics;
    if (res.partial) rec.partial = true;

    const domain = run.input.domain;
    const ownerId = run.ownerId || 'operator';
    if (!hasBaseline(domain, page.slug, vp.name, ownerId)) {
      promote(domain, page.slug, vp.name, abs, ownerId);
      rec.status = 'new';
    } else {
      fs.mkdirSync(path.dirname(path.join(dir, rels.base)), { recursive: true });
      fs.mkdirSync(path.dirname(path.join(dir, rels.diff)), { recursive: true });
      fs.copyFileSync(baselinePath(domain, page.slug, vp.name, ownerId), path.join(dir, rels.base));
      const d = diffImages(path.join(dir, rels.base), abs, path.join(dir, rels.diff));
      rec.base = asPosixRel(rels.base);
      rec.diff = asPosixRel(rels.diff);
      rec.diffPercent = Number(d.diffPercent.toFixed(4));
      rec.sizeChanged = d.sizeChanged;
      rec.status = captureDiffStatus(d.diffPercent, d.sizeChanged, config.diffThresholdPercent);
    }
    if (rec.shot) await storage.mirrorArtifact(run.id, rec.shot);
    await touchBaseline(siteHash(domain), ownerId);
  } catch (e) {
    rec.status = 'error';
    rec.error = firstLine(e);
  }
}

export function evaluateCrossViewport(page) {
  const deskRec = page.viewports.desktop || page.viewports.fhd || page.viewports.ultrawide;
  const mobRec = page.viewports.mobile;
  const tabRec = page.viewports.tablet;
  if (!deskRec?.metrics) return;

  const { tablet, mobile } = crossViewportViolations({
    deskH1: deskRec.metrics.headings?.h1,
    deskH2: deskRec.metrics.headings?.h2,
    tabH1: tabRec?.metrics?.headings?.h1,
    mobH1: mobRec?.metrics?.headings?.h1,
    mobH2: mobRec?.metrics?.headings?.h2,
    mobBody: mobRec?.metrics?.bodyFont || 16,
  });

  if (tablet.length && tabRec) {
    tabRec.violations = tabRec.violations || [];
    tabRec.violations.push(...tablet);
  }
  if (mobile.length && mobRec) {
    mobRec.violations = mobRec.violations || [];
    mobRec.violations.push(...mobile);
  }
}
