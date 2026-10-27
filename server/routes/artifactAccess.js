import path from 'node:path';

const MEDIA = /\.(png|jpe?g|webp|gif|pdf)$/i;

/** Parse `/runId/relative/path` from an Express mount path; null when unsafe. */
export function parseArtifactPath(urlPath) {
  const parts = String(urlPath || '').split('/').filter(Boolean);
  const runId = parts.shift();
  const rel = parts.join('/');
  if (!runId || !rel || rel.includes('..') || path.isAbsolute(rel)) return null;
  return { runId, rel };
}

/**
 * Tenant + anonymity gate. Bearer keys are owner-scoped; pages/anonymous
 * callers may only fetch media (png/jpeg/webp/gif/pdf).
 */
export function canReadArtifact(auth, run, rel) {
  if (!run || !rel) return false;
  if (auth?.via === 'key' && run.ownerId !== auth.ownerId) return false;
  if (auth?.via !== 'key' && auth?.via !== 'cookie' && !MEDIA.test(rel)) return false;
  return true;
}

/** True when `abs` resolves to a file under `root` (no traversal). */
export function isPathInside(root, abs) {
  const rel = path.relative(path.resolve(root), path.resolve(abs));
  return rel !== '' && !rel.startsWith('..') && !path.isAbsolute(rel);
}

export { MEDIA };
