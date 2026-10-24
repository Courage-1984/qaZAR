import fs from 'node:fs';
import path from 'node:path';
import crypto from 'node:crypto';
import { storage } from './storageAdapter.js';

/**
 * Database adapter interface for runs and tenant isolation.
 * Supports file-backed persistence with in-memory indexes and future-proof ownerId.
 */
class JsonDatabaseAdapter {
  constructor() {
    this.runs = new Map();
    this.events = new Map(); // runId -> Set<Response>
  }

  loadAll() {
    const runsDir = storage.runsRoot;
    if (!fs.existsSync(runsDir)) return;

    for (const id of fs.readdirSync(runsDir)) {
      const f = path.join(storage.getRunDir(id), 'run.json');
      if (!fs.existsSync(f)) continue;
      try {
        const r = JSON.parse(fs.readFileSync(f, 'utf8'));
        if (['queued', 'crawling', 'capturing'].includes(r.status)) {
          r.status = 'failed';
          r.error = 'Server restarted before run finished';
        }
        this.runs.set(id, r);
      } catch {
        /* ignore corrupted records */
      }
    }
  }

  create(input, { ownerId = 'default' } = {}) {
    const id =
      new Date().toISOString().replace(/[-:T.Z]/g, '').slice(0, 14) +
      '-' +
      crypto.randomBytes(3).toString('hex');

    const run = {
      id,
      ownerId,
      createdAt: new Date().toISOString(),
      input,
      status: 'queued',
      progress: { pagesDone: 0, pagesTotal: 0 },
      pages: [],
      summary: null,
      error: null,
    };

    this.runs.set(id, run);
    this.save(run);
    return run;
  }

  get(id, { ownerId = null } = {}) {
    const run = this.runs.get(id);
    if (!run) return null;
    if (ownerId && run.ownerId !== ownerId) return null;
    return run;
  }

  list({ ownerId = null } = {}) {
    let list = [...this.runs.values()];
    if (ownerId) list = list.filter((r) => r.ownerId === ownerId);
    return list
      .sort((a, b) => b.createdAt.localeCompare(a.createdAt))
      .map(({ pages, ...rest }) => rest);
  }

  save(run) {
    storage.writeArtifact(run.id, 'run.json', JSON.stringify(run, null, 2));
    this.broadcast(run.id, {
      status: run.status,
      progress: run.progress,
      summary: run.summary,
    });
  }

  delete(id, { ownerId = null } = {}) {
    const run = this.get(id, { ownerId });
    if (!run) return false;
    this.runs.delete(id);
    storage.deleteRunArtifacts(id);
    this.events.delete(id);
    return true;
  }

  subscribe(id, res) {
    if (!this.events.has(id)) this.events.set(id, new Set());
    const subs = this.events.get(id);
    subs.add(res);
    res.on('close', () => subs.delete(res));
  }

  broadcast(id, data) {
    const subs = this.events.get(id);
    if (!subs || !subs.size) return;
    const payload = `data: ${JSON.stringify(data)}\n\n`;
    for (const res of subs) {
      try {
        res.write(payload);
      } catch {
        subs.delete(res);
      }
    }
  }
}

export const db = new JsonDatabaseAdapter();
