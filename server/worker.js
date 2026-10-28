import crypto from 'node:crypto';
import {
  claim, complete, countJobs, fail, heartbeat, reclaimExpired, recoverAfterRestart,
  retryLater, dbDriver,
} from './queue/jobs.js';
import { shouldStealLiveLeases } from './queue/jobPolicy.js';
import { awaitDb, dbPath } from './storage/db.js';
import { processRun } from './queue/jobQueue.js';
import { deliverMail, emailErrorLine } from './queue/finishRun.js';
import {
  emailRetryDelayMs,
  heartbeatIntervalMs,
  maxConcurrentRuns,
  workerIdleMs,
  workerLeaseMs,
} from './queue/workerPolicy.js';
import { decideEmailOutcome } from './queue/emailJobDecide.js';
import { getRun, save } from './storage/runStore.js';
import { closeBrowser, getBrowser } from './engine/capturePage.js';
import { pruneBaselines } from './quota/prune.js';

const workerId = process.env.WORKER_ID || crypto.randomUUID();
const LEASE = workerLeaseMs();
const IDLE_MS = workerIdleMs();
const MAX_RUNS = maxConcurrentRuns();
let stopping = false;

async function emailJob(job) {
  const run = await getRun(job.run_id);
  if (decideEmailOutcome({ runExists: Boolean(run) }) === 'complete-missing') {
    await complete(job.id);
    return;
  }
  try {
    await deliverMail(run);
    await complete(job.id);
  } catch (e) {
    const outcome = decideEmailOutcome({ runExists: true, deliveredOk: false, attempts: job.attempts });
    if (outcome === 'complete-dead') {
      run.emailError = emailErrorLine(e);
      await save(run);
      await complete(job.id);
      return;
    }
    await retryLater(job.id, emailRetryDelayMs(job.attempts), e);
  }
}

async function handleJob(job) {
  console.log(`qaZAR worker ${workerId.slice(0, 8)} claimed ${job.kind} ${job.run_id}`);
  const beat = setInterval(() => {
    heartbeat(job.id, LEASE).catch(() => {});
  }, heartbeatIntervalMs(LEASE));
  try {
    if (job.kind === 'email') {
      await emailJob(job);
      return;
    }
    try {
      await processRun(job.run_id);
      await complete(job.id);
    } catch (e) {
      console.error(`qaZAR worker audit failed ${job.run_id}: ${e.message || e}`);
      const dead = await fail(job.id, e);
      if (dead) {
        const run = await getRun(job.run_id);
        if (run && run.status !== 'cancelled') {
          run.status = 'failed';
          run.error = emailErrorLine(e);
          await save(run);
        }
      }
    }
  } finally {
    clearInterval(beat);
  }
}

function sleep(ms) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

/** Fill up to MAX_CONCURRENT_RUNS parallel jobs from the durable SQLite/Postgres queue. */
async function loop() {
  const active = new Set();
  while (!stopping) {
    try {
      await reclaimExpired();
      while (!stopping && active.size < MAX_RUNS) {
        const job = await claim(workerId, LEASE);
        if (!job) break;
        const task = handleJob(job).catch((e) => {
          console.error('worker job failed', e);
        }).finally(() => active.delete(task));
        active.add(task);
      }
      if (stopping) break;
      if (active.size === 0) await sleep(IDLE_MS);
      else await Promise.race([...active, sleep(IDLE_MS)]);
    } catch (e) {
      console.error('worker tick failed', e);
      if (!stopping) await sleep(IDLE_MS);
    }
  }
  await Promise.allSettled([...active]);
}

function shutdown(signal) {
  console.log(`qaZAR worker received ${signal}, draining…`);
  stopping = true;
  closeBrowser().finally(() => process.exit(0));
}

process.on('SIGINT', () => shutdown('SIGINT'));
process.on('SIGTERM', () => shutdown('SIGTERM'));

await awaitDb();
const counts = await countJobs();
console.log(`qaZAR worker ready (${dbDriver} ${dbPath()}) id=${workerId.slice(0, 8)}`);
console.log(`qaZAR worker concurrency=${MAX_RUNS} queued=${counts.queued || 0} leased=${counts.leased || 0}`);
if ((counts.leased || 0) > 0 && !shouldStealLiveLeases(process.env, dbDriver)) {
  console.log('qaZAR worker tip: set QAZAR_SINGLE_WORKER=1 on a lone host to reclaim live leases immediately');
}
const recovered = await recoverAfterRestart();
if (recovered.stolen || recovered.recovered) {
  console.log(
    `qaZAR worker recovery stolen=${recovered.stolen || 0} `
    + `runs=${recovered.recovered || 0} enqueued=${recovered.enqueued || 0}`,
  );
}
try { await pruneBaselines(); } catch (e) { console.error('qaZAR worker prune', e.message || e); }
getBrowser().catch((e) => console.error('qaZAR worker browser', e.message || e));

loop();
