import { countInflight, getTier } from '../storage/db.js';
import { httpError } from '../util/httpError.js';
import { operatorLimits, partnerTierLimits } from './tierLimits.js';

export function isOperator(auth) {
  return !auth || auth.via !== 'key' || auth.ownerId === 'operator';
}

export async function limitsFor(auth) {
  if (isOperator(auth)) return operatorLimits();
  return partnerTierLimits(await getTier(auth.ownerId));
}

export async function assertInflight(auth) {
  const limits = await limitsFor(auth);
  if (!limits.limited) return limits;
  if ((await countInflight(auth.ownerId)) >= limits.inflight) {
    throw httpError(429, 'In-flight run limit reached');
  }
  return limits;
}
