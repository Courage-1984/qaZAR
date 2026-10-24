import fs from 'node:fs';
import path from 'node:path';
import crypto from 'node:crypto';
import { runsDir } from '../config.js';

const runs = new Map();
const events = new Map(); // runId -> Set<res>

export function runPath(id) {
  return path.join(runsDir(), id);
}

export function loadAll() {
  fs.mkdirSync(runsDir(), { recursive: true });
  for (const id of fs.readdirSync(runsDir())) {
    const f = path.join(runPath(id), 'run.json');
    if (!fs.existsSync(f)) continue;
    try {
      const r = JSON.parse(fs.readFileSync(f, 'utf8'));
      // runs interrupted by a restart cannot resume
      if (['queued', 'crawling', 'capturing'].includes(r.status)) {
        r.status = 'failed';
        r.error = 'Server restarted before run finished';
      }
      runs.set(id, r);
    } catch {
      /* ignore corrupt run */
    }
  }
}

export function createRun(input) {
  const id = new Date().toISOString().replace(/[-:T.Z]/g, '').slice(0, 14) + '-' + crypto.randomBytes(3).toString('hex');
  const run = {
    id,
    createdAt: new Date().toISOString(),
    input,
    status: 'queued',
    progress: { pagesDone: 0, pagesTotal: 0 },
    pages: [],
    summary: null,
    error: null,
  };
  runs.set(id, run);
  save(run);
  return run;
}

export const getRun = (id) => runs.get(id);
export const listRuns = () =>
  [...runs.values()]
    .sort((a, b) => b.createdAt.localeCompare(a.createdAt))
    .map(({ pages, ...rest }) => rest);

export function save(run) {
  fs.mkdirSync(runPath(run.id), { recursive: true });
  fs.writeFileSync(path.join(runPath(run.id), 'run.json'), JSON.stringify(run));
  const subs = events.get(run.id);
  if (subs) for (const res of subs) res.write(`data: ${JSON.stringify({ status: run.status, progress: run.progress })}\n\n`);
}

export function removeRun(id) {
  runs.delete(id);
  fs.rmSync(runPath(id), { recursive: true, force: true });
}

export function subscribe(id, res) {
  if (!events.has(id)) events.set(id, new Set());
  events.get(id).add(res);
  res.on('close', () => events.get(id)?.delete(res));
}
