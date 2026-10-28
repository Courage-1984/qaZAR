import { firstLine } from '../util/firstLine.js';

/** After this many failed/expired attempts a job is marked failed. */
export const MAX_JOB_ATTEMPTS = 3;

export function nextAttempts(current = 0) {
  return (Number(current) || 0) + 1;
}

export function isDeadAttempt(attempts) {
  return attempts >= MAX_JOB_ATTEMPTS;
}

export function jobErrorLine(err) {
  return firstLine(err || '');
}

/**
 * Only a lone SQLite worker may steal live leases on boot.
 * Multi-worker / Postgres must reclaim expired leases only.
 */
export function shouldStealLiveLeases(env = process.env, driver = 'sqlite') {
  return env.QAZAR_SINGLE_WORKER === '1' && driver === 'sqlite';
}
