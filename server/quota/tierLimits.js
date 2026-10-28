import { config } from '../config.js';
import { baselineRetentionDays } from './baselineRetention.js';

/** Operator / Pages console: uncapped, no baseline prune window. */
export function operatorLimits() {
  return { limited: false, pageCap: config.maxPagesCap, inflight: Infinity, baselineDays: null };
}

/** Free / pro partner key quotas (page cap, in-flight runs, baseline retention). */
export function partnerTierLimits(tier) {
  if (tier === 'pro') {
    return {
      limited: true,
      tier: 'pro',
      pageCap: 50,
      inflight: 3,
      baselineDays: baselineRetentionDays('pro'),
    };
  }
  return {
    limited: true,
    tier: 'free',
    pageCap: config.publicMaxPages,
    inflight: 1,
    baselineDays: baselineRetentionDays('free'),
  };
}
