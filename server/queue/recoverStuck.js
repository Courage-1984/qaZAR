/**
 * After a worker process dies, runs may sit in crawling/capturing while jobs
 * are requeued. Reset those runs and ensure an audit job exists.
 */
import { getDb } from '../storage/sqliteDb.js';
import { SERVER_RESTARTED_NOTE } from './jobTiming.js';
import { enqueue } from './sqliteQueue.js';

const STUCK = new Set(['crawling', 'capturing']);

function hasOpenAuditJob(runId) {
  const row = getDb().prepare(`
    SELECT COUNT(*) AS n FROM jobs
    WHERE run_id = ? AND kind = 'audit' AND status IN ('queued', 'leased')
  `).get(runId);
  return (row?.n || 0) > 0;
}

/**
 * @returns {{ recovered: number, enqueued: number }}
 */
export function recoverStuckRuns(now = Date.now()) {
  const rows = getDb().prepare(`
    SELECT id, payload FROM runs WHERE status IN ('crawling', 'capturing')
  `).all();
  const upd = getDb().prepare(`UPDATE runs SET status = ?, payload = ? WHERE id = ?`);
  let recovered = 0;
  let enqueued = 0;
  for (const row of rows) {
    let run;
    try { run = JSON.parse(row.payload); } catch { continue; }
    if (!STUCK.has(run.status)) continue;
    console.warn(`[qaZAR] ${SERVER_RESTARTED_NOTE} (${run.id} was ${run.status})`);
    run.status = 'queued';
    run.crawlMessage = SERVER_RESTARTED_NOTE;
    run.error = null;
    run.updatedAt = new Date(now).toISOString();
    upd.run('queued', JSON.stringify(run), run.id);
    recovered += 1;
    if (!hasOpenAuditJob(run.id)) {
      enqueue(run.id, 'audit');
      enqueued += 1;
    }
  }
  return { recovered, enqueued };
}
