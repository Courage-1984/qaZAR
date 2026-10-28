/**
 * Component-level health score with per-category penalty caps.
 * Counts distinct defect clusters (not viewport repeats).
 */

import { categoryBucket } from './defectCluster.js';

/** Points deducted per confirmed component failure. */
export const SEVERITY_PENALTY = Object.freeze({ error: 8, warn: 3, info: 0 });

/** Max points any single category may remove from the 100 baseline. */
export const CATEGORY_CAP = Object.freeze({
  mobileTouch: 20,
  overflowBreakage: 20,
  wcagContrast: 15,
  typography: 12,
  collisions: 15,
  other: 24,
});

export function letterGrade(score) {
  const n = Number(score);
  if (!Number.isFinite(n)) return null;
  if (n >= 90) return 'A';
  if (n >= 80) return 'B';
  if (n >= 70) return 'C';
  if (n >= 55) return 'D';
  return 'F';
}

/**
 * @param {Array<{ severity: string, rule: string }>} clusters
 * @returns {{ score: number, grade: string, categoryPenalties: object, uncappedPenalty: number }}
 */
export function scoreFromClusters(clusters = []) {
  const byCat = Object.create(null);
  let uncapped = 0;
  for (const c of clusters) {
    const pen = SEVERITY_PENALTY[c.severity] ?? 0;
    if (!pen) continue;
    uncapped += pen;
    const bucket = categoryBucket(c.rule) || 'other';
    byCat[bucket] = (byCat[bucket] || 0) + pen;
  }
  let capped = 0;
  const categoryPenalties = {};
  for (const [bucket, raw] of Object.entries(byCat)) {
    const cap = CATEGORY_CAP[bucket] ?? CATEGORY_CAP.other;
    const applied = Math.min(raw, cap);
    categoryPenalties[bucket] = { raw, applied, cap };
    capped += applied;
  }
  const score = Math.max(0, Math.min(100, 100 - capped));
  return {
    score,
    grade: letterGrade(score),
    categoryPenalties,
    uncappedPenalty: uncapped,
  };
}
