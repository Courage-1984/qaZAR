import { calculateHealthScore } from '../report/scoreCalculator.js';
import { reviewFindings } from '../report/findingReview.js';

/** Unguessable share tokens are UUIDs (v1–v5). */
const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

export function isShareToken(token) {
  return Boolean(token && UUID.test(token));
}

/**
 * Public share JSON — never includes contacts, pages, or owner fields.
 * `hasPdf` is supplied by the route (storage / filesystem check).
 */
export function buildSharePayload(run, hasPdf = false) {
  const done = run.status === 'done';
  const scored = done ? calculateHealthScore(run) : null;
  const review = done ? reviewFindings(run).counts : null;
  return {
    status: run.status,
    progress: run.progress || null,
    domain: run.input?.domain || '',
    coverage: scored?.metrics?.coverageLine || null,
    score: scored?.score ?? null,
    review,
    hasPdf: Boolean(hasPdf),
    finishedAt: run.finishedAt || null,
    error: run.status === 'failed' ? (run.error || 'failed') : null,
  };
}
