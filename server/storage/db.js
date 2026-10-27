/**
 * Database facade. SQLite (default) or Postgres when DATABASE_URL is set.
 * Call sites should treat these as async.
 */
import * as sqlite from './sqliteDb.js';
import * as postgres from './postgresDb.js';

export const dbDriver = process.env.DATABASE_URL ? 'postgres' : 'sqlite';

const ready = dbDriver === 'postgres' ? postgres.initPostgres() : Promise.resolve(sqlite.dbPath());

export function awaitDb() {
  return ready;
}

function wrap(name) {
  return async (...args) => {
    await ready;
    if (dbDriver === 'postgres') return postgres[name](...args);
    return sqlite[name](...args);
  };
}

export const upsertRun = wrap('upsertRun');
export const readRun = wrap('readRun');
export const readByShare = wrap('readByShare');
export const listRunPayloads = wrap('listRunPayloads');
export const countInflight = wrap('countInflight');
export const getTier = wrap('getTier');
export const setTier = wrap('setTier');
export const setTierByCustomer = wrap('setTierByCustomer');
export const touchBaseline = wrap('touchBaseline');
export const listBaselineMeta = wrap('listBaselineMeta');
export const deleteBaselineMeta = wrap('deleteBaselineMeta');
export const countActiveRuns = wrap('countActiveRuns');
export const deleteRunRow = wrap('deleteRunRow');

export function dbPath() {
  return dbDriver === 'postgres' ? postgres.dbPath() : sqlite.dbPath();
}

export async function closeDb() {
  if (dbDriver === 'postgres') await postgres.closePostgres();
}
