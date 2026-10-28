/** Pure viewport record updates after a successful capture / diff. */

import { captureDiffStatus } from '../visual/diffMetrics.js';
import { asPosixRel } from './viewportPaths.js';

export function applyCaptureSuccess(rec, res, shotRel) {
  rec.shot = asPosixRel(shotRel);
  rec.violations = res.violations;
  rec.metrics = res.metrics;
  if (res.partial) rec.partial = true;
  return rec;
}

export function applyDiffSuccess(rec, rels, diffResult, thresholdPercent) {
  rec.base = asPosixRel(rels.base);
  rec.diff = asPosixRel(rels.diff);
  rec.diffPercent = Number(diffResult.diffPercent.toFixed(4));
  rec.sizeChanged = diffResult.sizeChanged;
  rec.status = captureDiffStatus(diffResult.diffPercent, diffResult.sizeChanged, thresholdPercent);
  return rec;
}

/** Prefer desktop, then fhd, then ultrawide for cross-viewport baselines. */
export function deskViewportRec(viewports = {}) {
  return viewports.desktop || viewports.fhd || viewports.ultrawide || null;
}
