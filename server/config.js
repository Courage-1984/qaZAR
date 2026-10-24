import path from 'node:path';
import { fileURLToPath } from 'node:url';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');

export const config = {
  host: process.env.HOST || '0.0.0.0',
  port: Number(process.env.PORT || 8787),
  tunnel: process.argv.includes('--tunnel') || process.env.TUNNEL === '1',
  dataDir: process.env.DATA_DIR || path.join(root, 'data'),
  allowPrivate: process.env.ALLOW_PRIVATE === '1',
  pageConcurrency: Number(process.env.PAGE_CONCURRENCY || 2),
  navTimeoutMs: 45000,
  maxPagesCap: 200,
  maxShotHeight: 12000,
  diffThresholdPercent: 0.1,
};

export const runsDir = () => path.join(config.dataDir, 'runs');
export const baselinesDir = () => path.join(config.dataDir, 'baselines');
