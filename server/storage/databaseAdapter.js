import fs from 'node:fs';
import path from 'node:path';
import crypto from 'node:crypto';
import { storage } from './storageAdapter.js';
import {
  awaitDb, dbDriver, deleteRunRow, listRunPayloads, readByShare, readRun, upsertRun,
} from './db.js';

/**
 * Run index in SQLite or Postgres, with run.json kept beside the screenshots.
 * In-flight rows stay in-flight across a restart; workers reclaim expired leases.
 */
class SqlRunStore {
  constructor() {
    this.events = new Map();
  }

  async loadAll() {
    await awaitDb();
    if (storage.driver !== 'local' || dbDriver !== 'sqlite') return;
    const runsDir = storage.runsRoot;
    if (!fs.existsSync(runsDir)) return;
    for (const id of fs.readdirSync(runsDir)) {
      if (await readRun(id)) continue;
      const f = path.join(storage.getRunDir(id), 'run.json');
      if (!fs.existsSync(f)) continue;
      try {
        const run = JSON.parse(fs.readFileSync(f, 'utf8'));
        if (!run.shareToken) run.shareToken = crypto.randomUUID();
        if (!run.ownerId) run.ownerId = 'operator';
        await upsertRun(run);
      } catch {
        /* ignore corrupted records */
      }
    }
  }

  async create(input, { ownerId = 'operator' } = {}) {
    const run = {
      id: crypto.randomUUID(),
      shareToken: crypto.randomUUID(),
      ownerId,
      createdAt: new Date().toISOString(),
      input,
      status: 'queued',
      progress: { pagesDone: 0, pagesTotal: 0 },
      pages: [],
      summary: null,
      error: null,
    };
    await this.save(run);
    return run;
  }

  async get(id, { ownerId = null } = {}) {
    const run = await readRun(id);
    if (!run) return null;
    if (ownerId && run.ownerId !== ownerId) return null;
    return run;
  }

  async getByShareToken(token) {
    if (!token) return null;
    return readByShare(token);
  }

  async list({ ownerId = null } = {}) {
    let list = await listRunPayloads();
    if (ownerId) list = list.filter((r) => r.ownerId === ownerId);
    return list
      .sort((a, b) => b.createdAt.localeCompare(a.createdAt))
      .map(({ pages, ...rest }) => rest);
  }

  async save(run) {
    if (!(await readRun(run.id)) && !run.shareToken) return;
    await upsertRun(run);
    storage.writeArtifact(run.id, 'run.json', JSON.stringify(run));
    this.broadcast(run.id, {
      status: run.status,
      progress: run.progress,
      summary: run.summary,
    });
  }

  async delete(id, { ownerId = null } = {}) {
    const run = await readRun(id);
    if (!run) return false;
    if (ownerId && run.ownerId !== ownerId) return false;
    await deleteRunRow(id);
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
    if (!subs?.size) return;
    const payload = `data: ${JSON.stringify(data)}\n\n`;
    for (const res of subs) {
      try { res.write(payload); } catch { subs.delete(res); }
    }
  }
}

export const db = new SqlRunStore();
