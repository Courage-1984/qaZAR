/** Run statuses that count toward inflight / active-run quotas. */

export const INFLIGHT_STATUSES = Object.freeze(['queued', 'crawling', 'capturing']);

/** SQL IN-list fragment: 'queued', 'crawling', 'capturing' */
export function inflightStatusSql() {
  return INFLIGHT_STATUSES.map((s) => `'${s}'`).join(', ');
}

export function isInflightStatus(status) {
  return INFLIGHT_STATUSES.includes(String(status || ''));
}
