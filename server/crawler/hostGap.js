/** Clamp robots crawl-delay between the configured floor and cap (seconds). */
export function boundedGapSec(robotsDelaySec, floorSec, capSec) {
  const sec = Number(robotsDelaySec) || 0;
  return Math.min(Math.max(sec, floorSec), capSec);
}

/** Milliseconds to wait before the next fetch on a lane. */
export function gapWaitMs(last, now, gapMs) {
  if (!last) return 0;
  return Math.max(0, last + gapMs - now);
}
