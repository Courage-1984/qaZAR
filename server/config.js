import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { buildConfigFields } from './configEnv.js';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const fields = buildConfigFields();

export const config = {
  ...fields,
  dataDir: process.env.DATA_DIR || path.join(root, 'data'),
};

export const runsDir = () => path.join(config.dataDir, 'runs');
export const baselinesDir = () => path.join(config.dataDir, 'baselines');
