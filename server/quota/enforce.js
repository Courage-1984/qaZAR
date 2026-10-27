import { config } from '../config.js';
import { countInflight, getTier } from '../storage/sqliteDb.js';

export function isOperator(auth) {
  return !auth || auth.via !== 'key' || auth.ownerId === 'operator';
}

export function limitsFor(auth) {
  if (isOperator(auth)) {
    return { limited: false, pageCap: config.maxPagesCap, inflight: Infinity, baselineDays: null };
  }
  const tier = getTier(auth.ownerId);
  if (tier === 'pro') return { limited: true, tier, pageCap: 50, inflight: 3, baselineDays: 365 };
  return { limited: true, tier: 'free', pageCap: config.publicMaxPages, inflight: 1, baselineDays: 14 };
}

export function assertInflight(auth) {
  const limits = limitsFor(auth);
  if (!limits.limited) return limits;
  if (countInflight(auth.ownerId) >= limits.inflight) {
    const err = new Error('In-flight run limit reached');
    err.status = 429;
    throw err;
  }
  return limits;
}
