import test from 'node:test';
import assert from 'node:assert/strict';
import { decideEmailOutcome } from '../queue/emailJobDecide.js';

test('decideEmailOutcome covers missing ok dead and retry', () => {
  assert.equal(decideEmailOutcome({ runExists: false }), 'complete-missing');
  assert.equal(decideEmailOutcome({ runExists: true, deliveredOk: true }), 'complete-ok');
  assert.equal(decideEmailOutcome({ runExists: true, deliveredOk: false, attempts: 0 }), 'retry');
  assert.equal(decideEmailOutcome({ runExists: true, deliveredOk: false, attempts: 2 }), 'complete-dead');
});
