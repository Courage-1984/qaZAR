/** Job status literals shared by sqlite and postgres queue drivers. */

export const JOB_QUEUED = 'queued';
export const JOB_LEASED = 'leased';
export const JOB_DONE = 'done';
export const JOB_FAILED = 'failed';
export const JOB_CANCELLED = 'cancelled';

/** Statuses that cancelRun may still cancel. */
export const CANCELABLE_JOB_STATUSES = Object.freeze([JOB_QUEUED, JOB_LEASED]);

/** SQL IN-list: 'queued', 'leased' */
export function cancelableJobStatusSql() {
  return CANCELABLE_JOB_STATUSES.map((s) => `'${s}'`).join(', ');
}
