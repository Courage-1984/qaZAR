/** Pure decisions for the worker email job path. */

import { isDeadEmailAttempt, nextEmailAttempt } from './workerPolicy.js';

/**
 * @returns {'complete-missing' | 'complete-ok' | 'complete-dead' | 'retry'}
 */
export function decideEmailOutcome({ runExists, deliveredOk, attempts = 0 } = {}) {
  if (!runExists) return 'complete-missing';
  if (deliveredOk) return 'complete-ok';
  const next = nextEmailAttempt(attempts);
  return isDeadEmailAttempt(next) ? 'complete-dead' : 'retry';
}
