import crypto from 'node:crypto';
import { claim, complete, fail, heartbeat, reclaimExpired, retryLater } from './queue/sqliteQueue.js';
import { processRun } from './queue/jobQueue.js';
import { deliverMail, BACKOFF } from './queue/finishRun.js';
import { getRun, save } from './storage/runStore.js';
import { closeBrowser } from './engine/capturePage.js';

const workerId = crypto.randomUUID();
const LEASE = 60_000;

async function emailJob(job) {
  const run = getRun(job.run_id);
  if (!run) {
    complete(job.id);
    return;
  }
  try {
    await deliverMail(run);
    complete(job.id);
  } catch (e) {
    const next = (job.attempts || 0) + 1;
    if (next >= 3) {
      run.emailError = String(e.message || e).split('\n')[0];
      save(run);
      complete(job.id);
      return;
    }
    retryLater(job.id, BACKOFF[job.attempts] || BACKOFF[2], e);
  }
}

async function tick() {
  reclaimExpired();
  const job = claim(workerId, LEASE);
  if (!job) return false;
  const beat = setInterval(() => {
    try { heartbeat(job.id, LEASE); } catch { /* lease row may be gone */ }
  }, 15_000);
  try {
    if (job.kind === 'email') await emailJob(job);
    else {
      try {
        await processRun(job.run_id);
        complete(job.id);
      } catch (e) {
        const dead = fail(job.id, e);
        if (dead) {
          const run = getRun(job.run_id);
          if (run && run.status !== 'cancelled') {
            run.status = 'failed';
            run.error = String(e.message || e).split('\n')[0];
            save(run);
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
  for (;;) {
    try {
      const worked = await tick();
      if (!worked) await new Promise((resolve) => setTimeout(resolve, 1000));
    } catch (e) {
      console.error('worker tick failed', e);
      await new Promise((resolve) => setTimeout(resolve, 1000));
    }
  }
}

process.on('SIGINT', () => { closeBrowser().finally(() => process.exit(0)); });
process.on('SIGTERM', () => { closeBrowser().finally(() => process.exit(0)); });

loop();
