import test from 'node:test';
import assert from 'node:assert/strict';
import { INFLIGHT_STATUSES, inflightStatusSql, isInflightStatus } from '../storage/inflightStatus.js';

test('INFLIGHT_STATUSES pins the three active run phases', () => {
  assert.deepEqual([...INFLIGHT_STATUSES], ['queued', 'crawling', 'capturing']);
});

test('inflightStatusSql is a quoted IN-list fragment', () => {
  assert.equal(inflightStatusSql(), "'queued', 'crawling', 'capturing'");
});

test('isInflightStatus rejects done and empty', () => {
  assert.equal(isInflightStatus('capturing'), true);
  assert.equal(isInflightStatus('done'), false);
  assert.equal(isInflightStatus(''), false);
});
