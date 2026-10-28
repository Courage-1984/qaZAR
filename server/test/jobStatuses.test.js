import test from 'node:test';
import assert from 'node:assert/strict';
import {
  CANCELABLE_JOB_STATUSES, JOB_LEASED, JOB_QUEUED, cancelableJobStatusSql,
} from '../queue/jobStatuses.js';

test('CANCELABLE_JOB_STATUSES pins queued and leased', () => {
  assert.deepEqual([...CANCELABLE_JOB_STATUSES], [JOB_QUEUED, JOB_LEASED]);
});

test('cancelableJobStatusSql is a quoted IN-list fragment', () => {
  assert.equal(cancelableJobStatusSql(), "'queued', 'leased'");
});
