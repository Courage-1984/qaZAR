/**
 * Shared runs/jobs/owners/baseline_meta DDL.
 * intType is INTEGER (sqlite) or BIGINT (postgres).
 */

export function coreTablesDdl(intType = 'INTEGER') {
  const T = intType;
  return `
CREATE TABLE IF NOT EXISTS runs (
  id TEXT PRIMARY KEY,
  owner_id TEXT NOT NULL,
  share_token TEXT NOT NULL UNIQUE,
  status TEXT NOT NULL,
  payload TEXT NOT NULL,
  lease_until ${T}
);
CREATE TABLE IF NOT EXISTS jobs (
  id TEXT PRIMARY KEY,
  run_id TEXT NOT NULL,
  kind TEXT NOT NULL,
  status TEXT NOT NULL,
  available_at ${T} NOT NULL,
  lease_until ${T},
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
  updated_at ${T} NOT NULL,
  PRIMARY KEY (owner_id, site_hash)
);
`.trim();
}

/** Postgres-only claim index over the shared jobs table. */
export const JOBS_CLAIM_INDEX_DDL =
  'CREATE INDEX IF NOT EXISTS jobs_claim_idx ON jobs (status, available_at, id);';
