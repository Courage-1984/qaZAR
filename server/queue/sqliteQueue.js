import crypto from 'node:crypto';
import { getDb } from '../storage/sqliteDb.js';
import { getRun, save } from '../storage/runStore.js';
import { isDeadAttempt, jobErrorLine, nextAttempts } from './jobPolicy.js';
import {
  LEASE_EXPIRED_ERROR,
  availableAt,
  canCancelRunStatus,
  expiredLeaseDecision,
  foldJobCounts,
  leaseUntil,
} from './jobTiming.js';

export function enqueue(runId, kind = 'audit', delayMs = 0) {
  const now = Date.now();
  getDb().prepare(`
    INSERT INTO jobs (id, run_id, kind, status, available_at, lease_until, attempts, last_error, worker_id)
    VALUES (?, ?, ?, 'queued', ?, NULL, 0, NULL, NULL)
  `).run(crypto.randomUUID(), runId, kind, availableAt(now, delayMs));
}

/** One UPDATE. The worker won only when a row comes back. */
export function claim(workerId, leaseMs, now = Date.now()) {
  return getDb().prepare(`
    UPDATE jobs
    SET status = 'leased', worker_id = ?, lease_until = ?
    WHERE id = (
      SELECT id FROM jobs
      WHERE status = 'queued' AND available_at <= ?
      ORDER BY available_at, id
      LIMIT 1
    ) AND status = 'queued'
    RETURNING id, run_id, kind, attempts
  `).get(workerId, leaseUntil(now, leaseMs), now) || null;
}

export function heartbeat(jobId, leaseMs, now = Date.now()) {
  getDb().prepare(`UPDATE jobs SET lease_until = ? WHERE id = ? AND status = 'leased'`).run(leaseUntil(now, leaseMs), jobId);
}

export function complete(jobId) {
  getDb().prepare(`UPDATE jobs SET status = 'done', lease_until = NULL WHERE id = ?`).run(jobId);
}

export function retryLater(jobId, delayMs, err, now = Date.now()) {
  const message = jobErrorLine(err);
  getDb().prepare(`
    UPDATE jobs
    SET status = 'queued', attempts = attempts + 1, available_at = ?, lease_until = NULL,
        worker_id = NULL, last_error = ?
    WHERE id = ?
  `).run(availableAt(now, delayMs), message, jobId);
}

export function fail(jobId, err, now = Date.now()) {
  const row = getDb().prepare('SELECT attempts FROM jobs WHERE id = ?').get(jobId);
  const attempts = nextAttempts(row?.attempts);
  const message = jobErrorLine(err);
  if (isDeadAttempt(attempts)) {
    getDb().prepare(`UPDATE jobs SET status = 'failed', attempts = ?, last_error = ?, lease_until = NULL WHERE id = ?`)
      .run(attempts, message, jobId);
    return true;
  }
  getDb().prepare(`
    UPDATE jobs SET status = 'queued', attempts = ?, available_at = ?, lease_until = NULL, worker_id = NULL, last_error = ?
    WHERE id = ?
  `).run(attempts, now, message, jobId);
  return false;
}

/** A new worker process is the only worker, so take back rows left leased by the last one. */
export function reclaimLeased(now = Date.now()) {
  getDb().prepare(`
    UPDATE jobs
    SET status = 'queued', lease_until = NULL, worker_id = NULL, available_at = ?
    WHERE status = 'leased'
  `).run(now);
}

export function countJobs() {
  return foldJobCounts(getDb().prepare(`SELECT status, COUNT(*) AS n FROM jobs GROUP BY status`).all());
}

export function reclaimExpired(now = Date.now()) {
  const rows = getDb().prepare(`SELECT id, attempts FROM jobs WHERE status = 'leased' AND lease_until < ?`).all(now);
  for (const row of rows) {
    const { attempts, dead } = expiredLeaseDecision(row.attempts);
    if (dead) {
      getDb().prepare(`UPDATE jobs SET status = 'failed', attempts = ?, last_error = ?, lease_until = NULL WHERE id = ?`)
        .run(attempts, LEASE_EXPIRED_ERROR, row.id);
    } else {
      getDb().prepare(`
        UPDATE jobs SET status = 'queued', attempts = ?, available_at = ?, lease_until = NULL, worker_id = NULL
        WHERE id = ?
      `).run(attempts, now, row.id);
    }
  }
}

export async function cancelRun(id) {
  const run = await getRun(id);
  if (run && canCancelRunStatus(run.status)) {
    run.status = 'cancelled';
    await save(run);
  }
  getDb().prepare(`
    UPDATE jobs SET status = 'cancelled', lease_until = NULL
    WHERE run_id = ? AND status IN ('queued', 'leased')
  `).run(id);
}
