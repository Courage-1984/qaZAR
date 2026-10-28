/** Worker lease / idle / email-retry policy (pure numbers + decisions). */

export const EMAIL_BACKOFF_MS = [60_000, 5 * 60_000, 15 * 60_000];
export const MAX_EMAIL_ATTEMPTS = 3;

export function workerLeaseMs(env = process.env) {
  return Number(env.WORKER_LEASE_MS || 60_000);
}

export function workerIdleMs(env = process.env) {
  return Number(env.WORKER_IDLE_MS || 400);
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
