import crypto from 'node:crypto';
import {
  claim, complete, countJobs, fail, heartbeat, reclaimExpired, reclaimOrphanedLeases, retryLater, dbDriver,
} from './queue/jobs.js';
import { awaitDb, dbPath } from './storage/db.js';
import { processRun } from './queue/jobQueue.js';
import { deliverMail, emailErrorLine } from './queue/finishRun.js';
import {
  emailRetryDelayMs,
  heartbeatIntervalMs,
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

async function tick() {
  await reclaimExpired();
  const job = await claim(workerId, LEASE);
  if (!job) return false;
  console.log(`qaZAR worker ${workerId.slice(0, 8)} claimed ${job.kind} ${job.run_id}`);
  const beat = setInterval(() => {
    heartbeat(job.id, LEASE).catch(() => {});
  }, heartbeatIntervalMs(LEASE));
  try {
    if (job.kind === 'email') await emailJob(job);
    else {
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
    }
  } finally {
    clearInterval(beat);
  }
  return true;
}

async function loop() {
  while (!stopping) {
    try {
      const worked = await tick();
      if (!worked && !stopping) await new Promise((resolve) => setTimeout(resolve, IDLE_MS));
    } catch (e) {
      console.error('worker tick failed', e);
      if (!stopping) await new Promise((resolve) => setTimeout(resolve, IDLE_MS));
    }
  }
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
console.log(`qaZAR worker jobs queued=${counts.queued || 0} leased=${counts.leased || 0}`);
await reclaimOrphanedLeases();
try { await pruneBaselines(); } catch (e) { console.error('qaZAR worker prune', e.message || e); }
getBrowser().catch((e) => console.error('qaZAR worker browser', e.message || e));

loop();
