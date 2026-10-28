import crypto from 'node:crypto';
import { getPool } from '../storage/postgresDb.js';
import { getRun, save } from '../storage/runStore.js';
import { isDeadAttempt, jobErrorLine, nextAttempts } from './jobPolicy.js';

export async function enqueue(runId, kind = 'audit', delayMs = 0) {
  const now = Date.now();
  await getPool().query(`
    INSERT INTO jobs (id, run_id, kind, status, available_at, lease_until, attempts, last_error, worker_id)
    VALUES ($1, $2, $3, 'queued', $4, NULL, 0, NULL, NULL)
  `, [crypto.randomUUID(), runId, kind, now + delayMs]);
}

/** SKIP LOCKED so multiple workers can claim without fighting. */
export async function claim(workerId, leaseMs, now = Date.now()) {
  const { rows } = await getPool().query(`
    WITH next AS (
      SELECT id FROM jobs
      WHERE status = 'queued' AND available_at <= $3
      ORDER BY available_at, id
      FOR UPDATE SKIP LOCKED
      LIMIT 1
    )
    UPDATE jobs AS j
    SET status = 'leased', worker_id = $1, lease_until = $2
    FROM next
    WHERE j.id = next.id
    RETURNING j.id, j.run_id, j.kind, j.attempts
  `, [workerId, now + leaseMs, now]);
  return rows[0] || null;
}

export async function heartbeat(jobId, leaseMs, now = Date.now()) {
  await getPool().query(
    `UPDATE jobs SET lease_until = $1 WHERE id = $2 AND status = 'leased'`,
    [now + leaseMs, jobId],
  );
}

export async function complete(jobId) {
  await getPool().query(
    `UPDATE jobs SET status = 'done', lease_until = NULL WHERE id = $1`,
    [jobId],
  );
}

export async function retryLater(jobId, delayMs, err, now = Date.now()) {
  const message = jobErrorLine(err);
  await getPool().query(`
    UPDATE jobs
    SET status = 'queued', attempts = attempts + 1, available_at = $1, lease_until = NULL,
        worker_id = NULL, last_error = $2
    WHERE id = $3
  `, [now + delayMs, message, jobId]);
}

export async function fail(jobId, err, now = Date.now()) {
  const { rows } = await getPool().query('SELECT attempts FROM jobs WHERE id = $1', [jobId]);
  const attempts = nextAttempts(rows[0]?.attempts);
  const message = jobErrorLine(err);
  if (isDeadAttempt(attempts)) {
    await getPool().query(
      `UPDATE jobs SET status = 'failed', attempts = $1, last_error = $2, lease_until = NULL WHERE id = $3`,
      [attempts, message, jobId],
    );
    return true;
  }
  await getPool().query(`
    UPDATE jobs SET status = 'queued', attempts = $1, available_at = $2, lease_until = NULL, worker_id = NULL, last_error = $3
    WHERE id = $4
  `, [attempts, now, message, jobId]);
  return false;
}

export async function reclaimExpired(now = Date.now()) {
  const { rows } = await getPool().query(
    `SELECT id, attempts FROM jobs WHERE status = 'leased' AND lease_until < $1`,
    [now],
  );
  for (const row of rows) {
    const attempts = nextAttempts(row.attempts);
    if (isDeadAttempt(attempts)) {
      await getPool().query(
        `UPDATE jobs SET status = 'failed', attempts = $1, last_error = 'lease expired', lease_until = NULL WHERE id = $2`,
        [attempts, row.id],
      );
    } else {
      await getPool().query(`
        UPDATE jobs SET status = 'queued', attempts = $1, available_at = $2, lease_until = NULL, worker_id = NULL
        WHERE id = $3
      `, [attempts, now, row.id]);
    }
  }
}

export async function countJobs() {
  const counts = { queued: 0, leased: 0 };
  const { rows } = await getPool().query(`SELECT status, COUNT(*)::int AS n FROM jobs GROUP BY status`);
  for (const row of rows) counts[row.status] = row.n;
  return counts;
}

export async function cancelRun(id) {
  const run = await getRun(id);
  if (run && !['done', 'failed'].includes(run.status)) {
    run.status = 'cancelled';
    await save(run);
  }
  await getPool().query(`
    UPDATE jobs SET status = 'cancelled', lease_until = NULL
    WHERE run_id = $1 AND status IN ('queued', 'leased')
  `, [id]);
}
