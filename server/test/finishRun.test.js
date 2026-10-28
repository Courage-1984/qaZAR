import test from 'node:test';
import assert from 'node:assert/strict';
import { BACKOFF, emailErrorLine } from '../queue/finishRun.js';

test('BACKOFF is three escalating delays in ms', () => {
  assert.deepEqual(BACKOFF, [60_000, 5 * 60_000, 15 * 60_000]);
});

test('emailErrorLine keeps only the first line of a message', () => {
  assert.equal(emailErrorLine(new Error('boom\nstack')), 'boom');
  assert.equal(emailErrorLine('plain'), 'plain');
  assert.equal(emailErrorLine({}), '[object Object]');
});
