import { isDeadAttempt, nextAttempts } from './jobPolicy.js';

export function leaseUntil(now, leaseMs) {
  return Number(now) + Number(leaseMs);
}

export function availableAt(now, delayMs = 0) {
  return Number(now) + Number(delayMs || 0);
}

/** Fold GROUP BY status rows into { queued, leased, … }. */
export function foldJobCounts(rows = []) {
  const counts = { queued: 0, leased: 0 };
  for (const row of rows) counts[row.status] = row.n;
  return counts;
}

/**
 * Decide what happens when a leased job expires.
 * @returns {{ attempts: number, dead: boolean }}
 */
export function expiredLeaseDecision(currentAttempts) {
  const attempts = nextAttempts(currentAttempts);
  return { attempts, dead: isDeadAttempt(attempts) };
}

/** Runs that are already terminal cannot be cancelled. */
export function canCancelRunStatus(status) {
  return !['done', 'failed'].includes(status);
}

export const LEASE_EXPIRED_ERROR = 'lease expired';
