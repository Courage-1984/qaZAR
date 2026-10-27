import fs from 'node:fs';
import path from 'node:path';
import { DatabaseSync } from 'node:sqlite';
import { config } from '../config.js';

let db;
let dbFile = '';

function migrateBaselineMeta(database) {
  const cols = database.prepare('PRAGMA table_info(baseline_meta)').all();
  if (!cols.length) return;
  const pk = cols.filter((c) => c.pk).map((c) => c.name);
  if (pk.length === 1 && pk[0] === 'site_hash') {
    database.exec(`
      CREATE TABLE baseline_meta_new (
        owner_id TEXT NOT NULL,
        site_hash TEXT NOT NULL,
        updated_at INTEGER NOT NULL,
        PRIMARY KEY (owner_id, site_hash)
      );
      INSERT OR IGNORE INTO baseline_meta_new (owner_id, site_hash, updated_at)
        SELECT owner_id, site_hash, updated_at FROM baseline_meta;
      DROP TABLE baseline_meta;
      ALTER TABLE baseline_meta_new RENAME TO baseline_meta;
    `);
  }
}

function schema(database) {
  database.exec(`
    PRAGMA journal_mode = WAL;
    PRAGMA busy_timeout = 5000;
    CREATE TABLE IF NOT EXISTS runs (
      id TEXT PRIMARY KEY,
      owner_id TEXT NOT NULL,
      share_token TEXT NOT NULL UNIQUE,
      status TEXT NOT NULL,
      payload TEXT NOT NULL,
      lease_until INTEGER
    );
    CREATE TABLE IF NOT EXISTS jobs (
      id TEXT PRIMARY KEY,
      run_id TEXT NOT NULL,
      kind TEXT NOT NULL,
      status TEXT NOT NULL,
      available_at INTEGER NOT NULL,
      lease_until INTEGER,
      attempts INTEGER NOT NULL DEFAULT 0,
      last_error TEXT,
      worker_id TEXT
    );
    CREATE TABLE IF NOT EXISTS owners (
      owner_id TEXT PRIMARY KEY,
      tier TEXT NOT NULL DEFAULT 'free',
      stripe_customer_id TEXT
    );
    CREATE TABLE IF NOT EXISTS baseline_meta (
      owner_id TEXT NOT NULL,
      site_hash TEXT NOT NULL,
      updated_at INTEGER NOT NULL,
      PRIMARY KEY (owner_id, site_hash)
    );
  `);
  migrateBaselineMeta(database);
}

export function dbPath() {
  return path.join(config.dataDir, 'qazar.sqlite');
}

export function getDb() {
  const file = dbPath();
  if (db && dbFile === file) return db;
  if (db) db.close();
  fs.mkdirSync(path.dirname(file), { recursive: true });
  db = new DatabaseSync(file);
  schema(db);
  dbFile = file;
  return db;
}

export function upsertRun(run) {
  getDb().prepare(`
    INSERT INTO runs (id, owner_id, share_token, status, payload, lease_until)
    VALUES (?, ?, ?, ?, ?, NULL)
    ON CONFLICT(id) DO UPDATE SET
      owner_id = excluded.owner_id,
      share_token = excluded.share_token,
      status = excluded.status,
      payload = excluded.payload
  `).run(run.id, run.ownerId, run.shareToken, run.status, JSON.stringify(run));
}

function parse(row) {
  return row ? JSON.parse(row.payload) : null;
}

export function readRun(id) {
  return parse(getDb().prepare('SELECT payload FROM runs WHERE id = ?').get(id));
}

export function readByShare(token) {
  return parse(getDb().prepare('SELECT payload FROM runs WHERE share_token = ?').get(token));
}

export function listRunPayloads() {
  return getDb().prepare('SELECT payload FROM runs').all().map(parse);
}

export function countInflight(ownerId) {
  const row = getDb().prepare(`SELECT COUNT(*) AS n FROM runs WHERE owner_id = ? AND status IN ('queued', 'crawling', 'capturing')`).get(ownerId);
  return row?.n || 0;
}

export function getTier(ownerId) {
  const row = getDb().prepare('SELECT tier FROM owners WHERE owner_id = ?').get(ownerId);
  return row?.tier || 'free';
}

export function setTier(ownerId, tier, stripeCustomerId = null) {
  getDb().prepare(`
    INSERT INTO owners (owner_id, tier, stripe_customer_id) VALUES (?, ?, ?)
    ON CONFLICT(owner_id) DO UPDATE SET tier = excluded.tier,
      stripe_customer_id = COALESCE(excluded.stripe_customer_id, owners.stripe_customer_id)
  `).run(ownerId, tier, stripeCustomerId);
}

export function setTierByCustomer(customerId, tier) {
  getDb().prepare('UPDATE owners SET tier = ? WHERE stripe_customer_id = ?').run(tier, customerId);
}

export function touchBaseline(siteHash, ownerId, now = Date.now()) {
  getDb().prepare(`
    INSERT INTO baseline_meta (owner_id, site_hash, updated_at) VALUES (?, ?, ?)
    ON CONFLICT(owner_id, site_hash) DO UPDATE SET updated_at = excluded.updated_at
  `).run(ownerId, siteHash, now);
}

export function listBaselineMeta() {
  return getDb().prepare('SELECT owner_id, site_hash, updated_at FROM baseline_meta').all();
}

export function deleteBaselineMeta(ownerId, siteHash) {
  getDb().prepare('DELETE FROM baseline_meta WHERE owner_id = ? AND site_hash = ?').run(ownerId, siteHash);
}

export function countActiveRuns() {
  const row = getDb().prepare(`SELECT COUNT(*) AS n FROM runs WHERE status IN ('queued', 'crawling', 'capturing')`).get();
  return row?.n || 0;
}

export function deleteRunRow(id) {
  const database = getDb();
  database.prepare('DELETE FROM jobs WHERE run_id = ?').run(id);
  database.prepare('DELETE FROM runs WHERE id = ?').run(id);
}
