import { config } from '../config.js';

/**
 * CORS allowlist: empty Origin (non-browser / same-origin tools), localhost,
 * GitHub Pages, Logi-Ink, plus QAZAR_ALLOWED_ORIGINS entries.
 */
export function originAllowed(origin, allowed = config.allowedOrigins) {
  if (!origin) return true;
  let host = '';
  try {
    host = new URL(origin).hostname;
  } catch {
    return false;
  }
  if (host === 'localhost' || host === '127.0.0.1' || host.endsWith('github.io')) return true;
  if (host === 'logi-ink.co.za' || host.endsWith('.logi-ink.co.za')) return true;
  return allowed.includes(origin);
}
