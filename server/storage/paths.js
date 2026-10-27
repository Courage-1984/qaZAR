/** Shared path helpers for run/baseline trees (no storage imports). */

export function siteHash(domain) {
  return String(domain || '').replace(/https?:\/\//, '').replace(/[^a-zA-Z0-9.-]/g, '_');
}

/** Safe path segment for owner-scoped baseline trees. */
export function ownerSeg(ownerId = 'operator') {
  return String(ownerId || 'operator').replace(/[^a-zA-Z0-9._-]/g, '_').slice(0, 64) || 'operator';
}
