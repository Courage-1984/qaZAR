import crypto from 'node:crypto';
import {
  claim, complete, countJobs, fail, heartbeat, reclaimExpired, reclaimOrphanedLeases, retryLater, dbDriver,
} from './queue/jobs.js';
import { awaitDb, dbPath } from './storage/db.js';
import { processRun } from './queue/jobQueue.js';
import { deliverMail, BACKOFF } from './queue/finishRun.js';
import { getRun, save } from './storage/runStore.js';
import { closeBrowser, getBrowser } from './engine/capturePage.js';
import { pruneBaselines } from './quota/prune.js';

const workerId = process.env.WORKER_ID || crypto.randomUUID();
const LEASE = Number(process.env.WORKER_LEASE_MS || 60_000);
const IDLE_MS = Number(process.env.WORKER_IDLE_MS || 400);
let stopping = false;

async function emailJob(job) {
  const run = await getRun(job.run_id);
  if (!run) {
    await complete(job.id);
    return;
  }
  try {
    await deliverMail(run);
    await complete(job.id);
  } catch (e) {
    const next = (job.attempts || 0) + 1;
    if (next >= 3) {
      run.emailError = String(e.message || e).split('\n')[0];
      await save(run);
      await complete(job.id);
      return;
    }
    await retryLater(job.id, BACKOFF[job.attempts] || BACKOFF[2], e);
  }
}

async function tick() {
  await reclaimExpired();
  const job = await claim(workerId, LEASE);
  if (!job) return false;
  console.log(`qaZAR worker ${workerId.slice(0, 8)} claimed ${job.kind} ${job.run_id}`);
  const beat = setInterval(() => {
    heartbeat(job.id, LEASE).catch(() => {});
  }, Math.max(5_000, Math.floor(LEASE / 4)));
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
            run.error = String(e.message || e).split('\n')[0];
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
