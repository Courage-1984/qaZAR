/** Pure env → config field parsers (no filesystem). */

export function envNumber(raw, fallback) {
  const n = Number(raw);
  return Number.isFinite(n) ? n : fallback;
}

export function envFlagTrue(raw) {
  return String(raw || '') === '1';
}

export function envCsvList(raw = '') {
  return String(raw).split(',').map((s) => s.trim()).filter(Boolean);
}

/** Tunnel runs unless --no-tunnel / NO_TUNNEL=1 / QAZAR_TUNNEL=0. */
export function tunnelEnabled(argv = process.argv, env = process.env) {
  return !argv.includes('--no-tunnel') && env.NO_TUNNEL !== '1' && env.QAZAR_TUNNEL !== '0';
}

export function dbDriverFromEnv(env = process.env) {
  return env.DATABASE_URL ? 'postgres' : 'sqlite';
}

export function buildConfigFields(env = process.env, argv = process.argv) {
  return {
    host: env.HOST || '0.0.0.0',
    port: envNumber(env.PORT, 8787),
    tunnel: tunnelEnabled(argv, env),
    allowPrivate: envFlagTrue(env.ALLOW_PRIVATE),
    pageConcurrency: envNumber(env.PAGE_CONCURRENCY, 4),
    publicPageConcurrency: envNumber(env.PUBLIC_PAGE_CONCURRENCY, 6),
    crawlConcurrency: envNumber(env.CRAWL_CONCURRENCY, 6),
    navTimeoutMs: 45000,
    maxPagesCap: 200,
    publicMaxPages: envNumber(env.PUBLIC_MAX_PAGES, 5),
    dbDriver: dbDriverFromEnv(env),
    storageDriver: env.STORAGE_DRIVER || 'local',
    hostGapSec: envNumber(env.HOST_GAP_SEC, 0),
    hostGapCapSec: envNumber(env.HOST_GAP_CAP_SEC, 10),
    hostInflight: envNumber(env.HOST_INFLIGHT, 2),
    allowedOrigins: envCsvList(env.QAZAR_ALLOWED_ORIGINS),
    maxShotHeight: 12000,
    diffThresholdPercent: 0.1,
  };
}
