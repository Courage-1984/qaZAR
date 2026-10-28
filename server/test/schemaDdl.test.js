import test from 'node:test';
import assert from 'node:assert/strict';
import { JOBS_CLAIM_INDEX_DDL, coreTablesDdl } from '../storage/schemaDdl.js';

test('coreTablesDdl pins table names and swaps integer dialect', () => {
  const sqlite = coreTablesDdl('INTEGER');
  const pg = coreTablesDdl('BIGINT');
  for (const ddl of [sqlite, pg]) {
    assert.match(ddl, /CREATE TABLE IF NOT EXISTS runs/);
    assert.match(ddl, /CREATE TABLE IF NOT EXISTS jobs/);
    assert.match(ddl, /CREATE TABLE IF NOT EXISTS owners/);
    assert.match(ddl, /CREATE TABLE IF NOT EXISTS baseline_meta/);
    assert.match(ddl, /PRIMARY KEY \(owner_id, site_hash\)/);
  }
  assert.match(sqlite, /lease_until INTEGER/);
  assert.match(pg, /lease_until BIGINT/);
  assert.match(pg, /updated_at BIGINT NOT NULL/);
});

test('JOBS_CLAIM_INDEX_DDL pins postgres claim index', () => {
  assert.match(JOBS_CLAIM_INDEX_DDL, /jobs_claim_idx/);
  assert.match(JOBS_CLAIM_INDEX_DDL, /available_at/);
});
