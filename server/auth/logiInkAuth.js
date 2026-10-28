/** Logi-Ink partner auth via x-api-key (LOGI_INK_API_SECRET). */

import { timingSafeEqual } from '../util/timingSafeEqual.js';

export function logiInkSecret(env = process.env) {
  return String(env.LOGI_INK_API_SECRET || '');
}

export function logiInkOwnerId(env = process.env) {
  return String(env.LOGI_INK_OWNER_ID || 'logi-ink');
}

/** Dennis James Webster inbox for internal follow-up (env-overridable). */
export function logiInkOwnerEmail(env = process.env) {
  return String(env.LOGI_INK_OWNER_EMAIL || env.AGENCY_INBOX || '').trim();
}

export function readLogiInkApiKey(req) {
  return String(req.get?.('x-api-key') || req.headers?.['x-api-key'] || '').trim();
}

export function logiInkKeyMatches(supplied, env = process.env) {
  const expected = logiInkSecret(env);
  if (!expected || !supplied) return false;
  return timingSafeEqual(supplied, expected);
}

export function authViaLogiInk(env = process.env) {
  return {
    keyId: 'logi-ink',
    ownerId: logiInkOwnerId(env),
    via: 'key',
    publicCaller: true,
    source: 'logi-ink',
  };
}

/** Browser Origin from GitHub Pages. Other anonymous callers stay blocked. */
export function githubPagesOrigin(req) {
  const origin = String(req.get?.('origin') || req.headers?.origin || '').trim();
  if (!origin) return false;
  try {
    return new URL(origin).hostname.endsWith('github.io');
  } catch {
    return false;
  }
}

/**
 * When LOGI_INK_API_SECRET is set, POST /api/runs must present a valid
 * Logi-Ink x-api-key, a QAZAR bearer key, an operator cookie, or a
 * GitHub Pages Origin so the public console can still submit.
 */
export function requirePartnerOrOperatorOnPost(req, res, next) {
  if (req.method !== 'POST') return next();
  if (!logiInkSecret()) return next();
  if (req.auth?.via === 'key' || req.auth?.via === 'cookie') return next();
  if (req.auth?.via === 'pages' && githubPagesOrigin(req)) return next();
  return res.status(401).json({ error: 'Unauthorized' });
}
