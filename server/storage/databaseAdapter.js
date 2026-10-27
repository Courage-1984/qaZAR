import fs from 'node:fs';
import path from 'node:path';
import crypto from 'node:crypto';
import { storage } from './storageAdapter.js';
import { deleteRunRow, listRunPayloads, readByShare, readRun, upsertRun } from './sqliteDb.js';

/**
 * Run index in SQLite, with run.json kept beside the screenshots.
 * In-flight rows stay in-flight across a restart; the worker reclaims leases.
 */
class JsonDatabaseAdapter {
  constructor() {
    this.events = new Map();
  }

  loadAll() {
    const runsDir = storage.runsRoot;
    if (!fs.existsSync(runsDir)) return;
    for (const id of fs.readdirSync(runsDir)) {
      if (readRun(id)) continue;
      const f = path.join(storage.getRunDir(id), 'run.json');
      if (!fs.existsSync(f)) continue;
      try {
        const run = JSON.parse(fs.readFileSync(f, 'utf8'));
        if (!run.shareToken) run.shareToken = crypto.randomUUID();
        if (!run.ownerId) run.ownerId = 'operator';
        upsertRun(run);
      } catch {
        /* ignore corrupted records */
      }
    }
  }

  create(input, { ownerId = 'operator' } = {}) {
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
    this.save(run);
    return run;
  }

  get(id, { ownerId = null } = {}) {
    const run = readRun(id);
    if (!run) return null;
    if (ownerId && run.ownerId !== ownerId) return null;
    return run;
  }

  getByShareToken(token) {
    if (!token) return null;
    return readByShare(token);
  }

  list({ ownerId = null } = {}) {
    let list = listRunPayloads();
    if (ownerId) list = list.filter((r) => r.ownerId === ownerId);
    return list
      .sort((a, b) => b.createdAt.localeCompare(a.createdAt))
      .map(({ pages, ...rest }) => rest);
  }

  save(run) {
    if (!readRun(run.id) && !run.shareToken) return;
    upsertRun(run);
    storage.writeArtifact(run.id, 'run.json', JSON.stringify(run, null, 2));
    this.broadcast(run.id, {
      status: run.status,
      progress: run.progress,
      summary: run.summary,
    });
  }

  delete(id, { ownerId = null } = {}) {
    const run = readRun(id);
    if (!run) return false;
    if (ownerId && run.ownerId !== ownerId) return false;
    deleteRunRow(id);
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

export const db = new JsonDatabaseAdapter();
