/**
 * ROI (Return-On-Investment) Page Scorer for qaZAR.
 * Ranks and prioritizes crawled URLs so the limited capture quota (max_pages)
 * targets the highest-impact UX templates rather than duplicate/paginated content.
 */

import { clusterAdjustment, depthAdjustment } from './roiDepth.js';
import { applyRoiPatterns, pickRoiCandidates } from './roiPatterns.js';

/**
 * Calculates an ROI score for a given URL string.
 * @param {string} urlStr
 * @param {Map<string, number>} [seenPrefixes] Track template prefixes to penalize clusters
 * @returns {{ score: number, labels: string[] }}
 */
export function scoreUrl(urlStr, seenPrefixes = new Map()) {
  let score = 50; // base score
  const labels = [];

  try {
    const u = new URL(urlStr);
    const pathname = u.pathname;
    const segments = pathname.split('/').filter(Boolean);
    const depth = segments.length;

    const depthAdj = depthAdjustment(depth);
    score += depthAdj.delta;
    labels.push(...depthAdj.labels);

    const patterned = applyRoiPatterns(pathname, u.search);
    score += patterned.delta;
    labels.push(...patterned.labels);

    if (depth >= 2) {
      const prefix = `/${segments[0]}/`;
      const count = seenPrefixes.get(prefix) || 0;
      const cluster = clusterAdjustment(count, segments[0]);
      score += cluster.delta;
      labels.push(...cluster.labels);
      seenPrefixes.set(prefix, count + 1);
    }
  } catch {
    score = 0;
  }

  return { score: Math.max(0, score), labels };
}

/**
 * Sorts and selects the top ROI candidates up to maxCount.
 * Guarantees template diversity and high-impact pages.
 * @param {string[]} urls
 * @param {number} maxCount
 * @returns {string[]}
 */
export function selectTopRoiCandidates(urls, maxCount) {
  if (urls.length <= maxCount) return urls;

  const seenPrefixes = new Map();
  const scored = urls.map((url) => ({
    url,
    ...scoreUrl(url, seenPrefixes),
  }));

  scored.sort((a, b) => b.score - a.score);
  return pickRoiCandidates(scored, maxCount);
}
