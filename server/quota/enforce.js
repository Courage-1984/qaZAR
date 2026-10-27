import { config } from '../config.js';
import { countInflight, getTier } from '../storage/db.js';
import { httpError } from '../util/httpError.js';

export function isOperator(auth) {
  return !auth || auth.via !== 'key' || auth.ownerId === 'operator';
}

export async function limitsFor(auth) {
  if (isOperator(auth)) {
    return { limited: false, pageCap: config.maxPagesCap, inflight: Infinity, baselineDays: null };
  }
  const tier = await getTier(auth.ownerId);
  if (tier === 'pro') return { limited: true, tier, pageCap: 50, inflight: 3, baselineDays: 365 };
  return { limited: true, tier: 'free', pageCap: config.publicMaxPages, inflight: 1, baselineDays: 14 };
}

export async function assertInflight(auth) {
  const limits = await limitsFor(auth);
  if (!limits.limited) return limits;
  if ((await countInflight(auth.ownerId)) >= limits.inflight) {
    throw httpError(429, 'In-flight run limit reached');
  }
  return limits;
}
