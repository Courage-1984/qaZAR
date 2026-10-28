/** Object-key builders for S3 / R2 artifact mirrors. */

import { ownerSeg, siteHash } from './paths.js';

export function runArtifactKey(runId, rel) {
  return `runs/${runId}/${rel}`;
}

export function runPrefix(runId) {
  return `runs/${runId}/`;
}

export function baselineObjectKey(ownerId, domain, slug, viewport) {
  return `baselines/${ownerSeg(ownerId)}/${siteHash(domain)}/${slug}/${viewport}.png`;
}

export function baselineSitePrefix(ownerId, hash) {
  return `baselines/${ownerSeg(ownerId)}/${hash}/`;
}
