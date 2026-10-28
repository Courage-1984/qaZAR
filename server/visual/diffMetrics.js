/** Relative dimension change above this fraction counts as a size change. */
export const SIZE_JITTER = 0.02;

/** Ignore sub-2% dimension jitter from font and lazy-load height. */
export function dimensionShifted(from, to, jitter = SIZE_JITTER) {
  return from > 0 && Math.abs(to - from) / from > jitter;
}

export function sizeChanged(a, b, jitter = SIZE_JITTER) {
  return dimensionShifted(a.width, b.width, jitter) || dimensionShifted(a.height, b.height, jitter);
}

export function diffPercent(diffPixels, width, height) {
  const area = width * height;
  if (!area) return 0;
  return (diffPixels / area) * 100;
}

/** Viewport capture status after comparing against baseline. */
export function captureDiffStatus(diffPct, changedSize, thresholdPercent) {
  return diffPct >= thresholdPercent || changedSize ? 'changed' : 'unchanged';
}
