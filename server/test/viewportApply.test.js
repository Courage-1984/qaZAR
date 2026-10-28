import test from 'node:test';
import assert from 'node:assert/strict';
import { applyCaptureSuccess, applyDiffSuccess, deskViewportRec } from '../queue/viewportApply.js';

test('applyCaptureSuccess copies shot violations metrics partial', () => {
  const rec = {};
  applyCaptureSuccess(rec, { violations: [1], metrics: { a: 1 }, partial: true }, 'home\\desktop.png');
  assert.equal(rec.shot, 'home/desktop.png');
  assert.deepEqual(rec.violations, [1]);
  assert.equal(rec.partial, true);
});

test('applyDiffSuccess sets percent and status', () => {
  const rec = {};
  applyDiffSuccess(rec, { base: 'b.png', diff: 'd.png' }, { diffPercent: 1.23456, sizeChanged: false }, 0.5);
  assert.equal(rec.diffPercent, 1.2346);
  assert.equal(rec.sizeChanged, false);
  assert.ok(rec.status);
});

test('deskViewportRec prefers desktop then fhd then ultrawide', () => {
  assert.equal(deskViewportRec({ ultrawide: 1, fhd: 2, desktop: 3 }), 3);
  assert.equal(deskViewportRec({ ultrawide: 1, fhd: 2 }), 2);
  assert.equal(deskViewportRec({ ultrawide: 1 }), 1);
  assert.equal(deskViewportRec({}), null);
});
