/**
 * Job queue facade. SQLite (default) or Postgres when DATABASE_URL is set.
 * Multi-worker safe: only reclaim expired leases, never steal live leases.
 * Durability uses node:sqlite (DatabaseSync) — not better-sqlite3 — to avoid
 * native builds on Windows; API + schema match the leased-job design.
 */
import * as sqlite from './sqliteQueue.js';
import * as postgres from './postgresQueue.js';
import { awaitDb, dbDriver } from '../storage/db.js';
import { shouldStealLiveLeases } from './jobPolicy.js';
import { recoverStuckRuns } from './recoverStuck.js';

async function call(name, ...args) {
  await awaitDb();
  if (dbDriver === 'postgres') return postgres[name](...args);
  return sqlite[name](...args);
}

export const enqueue = (...a) => call('enqueue', ...a);
export const claim = (...a) => call('claim', ...a);
export const heartbeat = (...a) => call('heartbeat', ...a);
export const complete = (...a) => call('complete', ...a);
export const retryLater = (...a) => call('retryLater', ...a);
export const fail = (...a) => call('fail', ...a);
export const reclaimExpired = (...a) => call('reclaimExpired', ...a);
export const countJobs = (...a) => call('countJobs', ...a);
export const cancelRun = (...a) => call('cancelRun', ...a);

/** Only for single-worker cold start. Multi-worker must not steal live leases. */
export async function reclaimOrphanedLeases(...args) {
  if (shouldStealLiveLeases(process.env, dbDriver)) {
    return sqlite.reclaimLeased(...args);
  }
  return reclaimExpired(...args);
}

/**
 * Boot recovery: reclaim orphaned leases, then reset stuck run rows so
 * Logi-Ink leads are not left limbo after a process restart.
 */
export async function recoverAfterRestart(...args) {
  await awaitDb();
  const stolen = await reclaimOrphanedLeases(...args);
  if (dbDriver === 'postgres') {
    return { stolen: stolen || 0, recovered: 0, enqueued: 0 };
  }
  const stuck = recoverStuckRuns(...args);
  return { stolen: stolen || 0, ...stuck };
}

export { dbDriver };
