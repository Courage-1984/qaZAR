/**
 * Depth contribution to ROI score (shallow pages score higher).
 * Returns { delta, labels } without the base score of 50.
 */
export function depthAdjustment(depth) {
  if (depth === 0) return { delta: 50, labels: ['root'] };
  if (depth === 1) return { delta: 20, labels: [] };
  if (depth === 2) return { delta: 10, labels: [] };
  if (depth > 4) return { delta: -(depth - 4) * 10, labels: ['deep-path'] };
  return { delta: 0, labels: [] };
}

/** Cluster diminishing returns for repeated first-segment prefixes. */
export function clusterAdjustment(prefixCount, segment) {
  if (prefixCount <= 0) return { delta: 0, labels: [] };
  return { delta: -prefixCount * 15, labels: [`cluster-${segment}`] };
}
