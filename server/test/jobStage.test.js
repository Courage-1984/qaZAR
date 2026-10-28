import test from 'node:test';
import assert from 'node:assert/strict';
import {
  advanceStage, doneRunFields, failRunFields, isRunCancelled, stageLogLine,
} from '../queue/jobStage.js';

test('isRunCancelled treats missing and cancelled as stopped', () => {
  assert.equal(isRunCancelled(null), true);
  assert.equal(isRunCancelled({ status: 'cancelled' }), true);
  assert.equal(isRunCancelled({ status: 'capturing' }), false);
});

test('advanceStage only moves on new labels', () => {
  const seen = { current: '' };
  assert.equal(advanceStage(seen, 'crawling'), true);
  assert.equal(seen.current, 'crawling');
  assert.equal(advanceStage(seen, 'crawling'), false);
  assert.match(stageLogLine('rid', 'done'), /rid done/);
});

test('failRunFields and doneRunFields pin status timestamps', () => {
  const t = new Date('2024-01-01T00:00:00.000Z');
  assert.deepEqual(failRunFields(new Error('boom'), t), {
    status: 'failed', error: 'boom', finishedAt: '2024-01-01T00:00:00.000Z',
  });
  assert.equal(doneRunFields({ n: 1 }, 9, t).status, 'done');
  assert.equal(doneRunFields({ n: 1 }, 9, t).captureMs, 9);
});
