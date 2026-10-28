/** Worker lease / idle / email-retry / concurrency policy (pure numbers). */

export const EMAIL_BACKOFF_MS = [60_000, 5 * 60_000, 15 * 60_000];
export const MAX_EMAIL_ATTEMPTS = 3;
export const DEFAULT_MAX_CONCURRENT_RUNS = 2;
export const HARD_CAP_CONCURRENT_RUNS = 16;

export function workerLeaseMs(env = process.env) {
  return Number(env.WORKER_LEASE_MS || 60_000);
}

export function workerIdleMs(env = process.env) {
  return Number(env.WORKER_IDLE_MS || 400);
}

/** Parallel Playwright runs per worker process (Chromium RAM bound). */
export function maxConcurrentRuns(env = process.env) {
  const n = Number(env.MAX_CONCURRENT_RUNS ?? DEFAULT_MAX_CONCURRENT_RUNS);
  if (!Number.isFinite(n) || n < 1) return DEFAULT_MAX_CONCURRENT_RUNS;
  return Math.min(Math.floor(n), HARD_CAP_CONCURRENT_RUNS);
}

export function heartbeatIntervalMs(leaseMs) {
  return Math.max(5_000, Math.floor(Number(leaseMs) / 4));
}

export function nextEmailAttempt(attempts = 0) {
  return (Number(attempts) || 0) + 1;
}

export function isDeadEmailAttempt(attempts) {
  return attempts >= MAX_EMAIL_ATTEMPTS;
}

export function emailRetryDelayMs(attempts = 0) {
  return EMAIL_BACKOFF_MS[attempts] || EMAIL_BACKOFF_MS[EMAIL_BACKOFF_MS.length - 1];
}
