/** Load repo-root `.env` without overriding variables already set. No dependency. */

import { existsSync, readFileSync } from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

export function parseEnvLine(line) {
  const trimmed = String(line || '').trim();
  if (!trimmed || trimmed.startsWith('#')) return null;
  const eq = trimmed.indexOf('=');
  if (eq < 1) return null;
  const key = trimmed.slice(0, eq).trim();
  if (!/^[A-Za-z_][A-Za-z0-9_]*$/.test(key)) return null;
  let val = trimmed.slice(eq + 1).trim();
  if ((val.startsWith('"') && val.endsWith('"')) || (val.startsWith("'") && val.endsWith("'"))) {
    val = val.slice(1, -1);
  }
  return { key, val };
}

export function applyEnvLines(lines, env = process.env) {
  for (const line of lines) {
    const parsed = parseEnvLine(line);
    if (!parsed || env[parsed.key] !== undefined) continue;
    env[parsed.key] = parsed.val;
  }
}

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const envPath = path.join(root, '.env');
if (existsSync(envPath)) applyEnvLines(readFileSync(envPath, 'utf8').split(/\r?\n/));
