import fs from 'node:fs';
import path from 'node:path';
import crypto from 'node:crypto';
import { storage } from './storageAdapter.js';
import {
  awaitDb, dbDriver, deleteRunRow, listRunPayloads, readByShare, readRun, upsertRun,
} from './db.js';
import {
  formatSseData, listRunSummary, newRunRecord, runEventPayload,
} from './runRecord.js';
import { filterRunsByOwner, runVisibleToOwner, sortRunsNewestFirst } from './runOwnership.js';

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
    const run = newRunRecord(input, { ownerId });
    await this.save(run);
    return run;
  }

  async get(id, { ownerId = null } = {}) {
    const run = await readRun(id);
    return runVisibleToOwner(run, ownerId) ? run : null;
  }

  async getByShareToken(token) {
    if (!token) return null;
    return readByShare(token);
  }

  async list({ ownerId = null } = {}) {
    const list = filterRunsByOwner(await listRunPayloads(), ownerId);
    return sortRunsNewestFirst(list).map(listRunSummary);
  }

  async save(run) {
    if (!(await readRun(run.id)) && !run.shareToken) return;
    await upsertRun(run);
    storage.writeArtifact(run.id, 'run.json', JSON.stringify(run));
    this.broadcast(run.id, runEventPayload(run));
  }

  async delete(id, { ownerId = null } = {}) {
    const run = await readRun(id);
    if (!runVisibleToOwner(run, ownerId)) return false;
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
    const payload = formatSseData(data);
    for (const res of subs) {
      try { res.write(payload); } catch { subs.delete(res); }
    }
  }
}

export const db = new SqlRunStore();
