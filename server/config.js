import path from 'node:path';
import { fileURLToPath } from 'node:url';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');

export const config = {
  host: process.env.HOST || '0.0.0.0',
  port: Number(process.env.PORT || 8787),
  tunnel: !process.argv.includes('--no-tunnel') && process.env.NO_TUNNEL !== '1' && process.env.QAZAR_TUNNEL !== '0',
  dataDir: process.env.DATA_DIR || path.join(root, 'data'),
  allowPrivate: process.env.ALLOW_PRIVATE === '1',
  pageConcurrency: Number(process.env.PAGE_CONCURRENCY || 4),
  publicPageConcurrency: Number(process.env.PUBLIC_PAGE_CONCURRENCY || 6),
  crawlConcurrency: Number(process.env.CRAWL_CONCURRENCY || 6),
  navTimeoutMs: 45000,
  maxPagesCap: 200,
  publicMaxPages: Number(process.env.PUBLIC_MAX_PAGES || 5),
  dbDriver: process.env.DATABASE_URL ? 'postgres' : 'sqlite',
  storageDriver: process.env.STORAGE_DRIVER || 'local',
  hostGapSec: Number(process.env.HOST_GAP_SEC || 0),
  hostGapCapSec: Number(process.env.HOST_GAP_CAP_SEC || 10),
  hostInflight: Number(process.env.HOST_INFLIGHT || 2),
  allowedOrigins: String(process.env.QAZAR_ALLOWED_ORIGINS || '').split(',').map((s) => s.trim()).filter(Boolean),
  maxShotHeight: 12000,
  diffThresholdPercent: 0.1,
};

export const runsDir = () => path.join(config.dataDir, 'runs');
export const baselinesDir = () => path.join(config.dataDir, 'baselines');
