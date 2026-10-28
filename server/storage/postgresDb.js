import pg from 'pg';
import { config } from '../config.js';
import { inflightStatusSql } from './inflightStatus.js';
import { JOBS_CLAIM_INDEX_DDL, coreTablesDdl } from './schemaDdl.js';

const { Pool } = pg;
let pool;

const DDL = `${coreTablesDdl('BIGINT')};\n${JOBS_CLAIM_INDEX_DDL}`;

export function dbPath() {
  return process.env.DATABASE_URL || '';
}

export function getPool() {
  if (pool) return pool;
  const url = process.env.DATABASE_URL;
  if (!url) throw new Error('DATABASE_URL is not set');
  pool = new Pool({ connectionString: url, max: Number(process.env.PG_POOL || 8) });
  return pool;
}

async function migrateBaselineMeta(client) {
  const { rows } = await client.query(`
    SELECT a.attname
    FROM pg_index i
    JOIN pg_attribute a ON a.attrelid = i.indrelid AND a.attnum = ANY(i.indkey)
    WHERE i.indrelid = 'baseline_meta'::regclass AND i.indisprimary
  `).catch(() => ({ rows: [] }));
  const pk = rows.map((r) => r.attname);
  if (pk.length === 1 && pk[0] === 'site_hash') {
    await client.query(`
      CREATE TABLE baseline_meta_new (
        owner_id TEXT NOT NULL,
        site_hash TEXT NOT NULL,
        updated_at BIGINT NOT NULL,
        PRIMARY KEY (owner_id, site_hash)
      );
      INSERT INTO baseline_meta_new (owner_id, site_hash, updated_at)
        SELECT owner_id, site_hash, updated_at FROM baseline_meta
        ON CONFLICT DO NOTHING;
      DROP TABLE baseline_meta;
      ALTER TABLE baseline_meta_new RENAME TO baseline_meta;
    `);
  }
}

export async function initPostgres() {
  const client = await getPool().connect();
  try {
    await client.query(DDL);
    await migrateBaselineMeta(client);
  } finally {
    client.release();
  }
  return dbPath();
}

export async function closePostgres() {
  if (!pool) return;
  await pool.end();
  pool = null;
}

export async function upsertRun(run) {
  await getPool().query(`
    INSERT INTO runs (id, owner_id, share_token, status, payload, lease_until)
    VALUES ($1, $2, $3, $4, $5, NULL)
    ON CONFLICT (id) DO UPDATE SET
      owner_id = EXCLUDED.owner_id,
      share_token = EXCLUDED.share_token,
      status = EXCLUDED.status,
      payload = EXCLUDED.payload
  `, [run.id, run.ownerId, run.shareToken, run.status, JSON.stringify(run)]);
}

function parse(row) {
  return row ? JSON.parse(row.payload) : null;
}

export async function readRun(id) {
  const { rows } = await getPool().query('SELECT payload FROM runs WHERE id = $1', [id]);
  return parse(rows[0]);
}

export async function readByShare(token) {
  const { rows } = await getPool().query('SELECT payload FROM runs WHERE share_token = $1', [token]);
  return parse(rows[0]);
}

export async function listRunPayloads() {
  const { rows } = await getPool().query('SELECT payload FROM runs');
  return rows.map(parse);
}

export async function countInflight(ownerId) {
  const { rows } = await getPool().query(
    `SELECT COUNT(*)::int AS n FROM runs WHERE owner_id = $1 AND status IN (${inflightStatusSql()})`,
    [ownerId],
  );
  return rows[0]?.n || 0;
}

export async function getTier(ownerId) {
  const { rows } = await getPool().query('SELECT tier FROM owners WHERE owner_id = $1', [ownerId]);
  return rows[0]?.tier || 'free';
}

export async function setTier(ownerId, tier, stripeCustomerId = null) {
  await getPool().query(`
    INSERT INTO owners (owner_id, tier, stripe_customer_id) VALUES ($1, $2, $3)
    ON CONFLICT (owner_id) DO UPDATE SET tier = EXCLUDED.tier,
      stripe_customer_id = COALESCE(EXCLUDED.stripe_customer_id, owners.stripe_customer_id)
  `, [ownerId, tier, stripeCustomerId]);
}

export async function setTierByCustomer(customerId, tier) {
  await getPool().query('UPDATE owners SET tier = $1 WHERE stripe_customer_id = $2', [tier, customerId]);
}

export async function touchBaseline(siteHash, ownerId, now = Date.now()) {
  await getPool().query(`
    INSERT INTO baseline_meta (owner_id, site_hash, updated_at) VALUES ($1, $2, $3)
    ON CONFLICT (owner_id, site_hash) DO UPDATE SET updated_at = EXCLUDED.updated_at
  `, [ownerId, siteHash, now]);
}

export async function listBaselineMeta() {
  const { rows } = await getPool().query('SELECT owner_id, site_hash, updated_at FROM baseline_meta');
  return rows;
}

export async function deleteBaselineMeta(ownerId, siteHash) {
  await getPool().query('DELETE FROM baseline_meta WHERE owner_id = $1 AND site_hash = $2', [ownerId, siteHash]);
}

export async function countActiveRuns() {
  const { rows } = await getPool().query(
    `SELECT COUNT(*)::int AS n FROM runs WHERE status IN (${inflightStatusSql()})`,
  );
  return rows[0]?.n || 0;
}

export async function deleteRunRow(id) {
  const client = await getPool().connect();
  try {
    await client.query('BEGIN');
    await client.query('DELETE FROM jobs WHERE run_id = $1', [id]);
    await client.query('DELETE FROM runs WHERE id = $1', [id]);
    await client.query('COMMIT');
  } catch (e) {
    await client.query('ROLLBACK');
    throw e;
  } finally {
    client.release();
  }
}

export { config };
