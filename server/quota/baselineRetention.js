const DAY = 24 * 60 * 60 * 1000;

/** Retention window in days for non-operator owners (matches quota.enforce baselineDays). */
export function baselineRetentionDays(tier) {
  return tier === 'pro' ? 365 : 14;
}

/**
 * Operator baselines are never pruned. Free/pro rows prune when older than
 * their retention window (updated_at is ms epoch).
 */
export function shouldPruneBaseline({ ownerId, tier, updatedAt, now }) {
  if (ownerId === 'operator') return false;
  return now - updatedAt >= baselineRetentionDays(tier) * DAY;
}

export { DAY };
