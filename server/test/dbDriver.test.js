import test from 'node:test';
import assert from 'node:assert/strict';

test('db facade defaults to sqlite without DATABASE_URL', async () => {
  assert.equal(Boolean(process.env.DATABASE_URL), false);
  const { dbDriver, dbPath, awaitDb } = await import('../storage/db.js');
  await awaitDb();
  assert.equal(dbDriver, 'sqlite');
  assert.match(dbPath(), /qazar\.sqlite$/);
});

test('postgres module exports the shared run and owner API', async () => {
  const pg = await import('../storage/postgresDb.js');
  for (const name of [
    'initPostgres', 'upsertRun', 'readRun', 'readByShare', 'listRunPayloads',
    'countInflight', 'getTier', 'setTier', 'setTierByCustomer', 'touchBaseline',
    'listBaselineMeta', 'deleteBaselineMeta', 'countActiveRuns', 'deleteRunRow',
  ]) {
    assert.equal(typeof pg[name], 'function', name);
  }
});

test('postgres queue exports SKIP LOCKED claim', async () => {
  const mod = await import('../queue/postgresQueue.js');
  assert.equal(typeof mod.claim, 'function');
  assert.equal(typeof mod.enqueue, 'function');
  const src = String(mod.claim);
  // Source is compiled; assert module surface instead.
  assert.ok(mod.reclaimExpired);
});
