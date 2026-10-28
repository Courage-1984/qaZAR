import test from 'node:test';
import assert from 'node:assert/strict';
import {
  buildCapturePayload, captureTimings, isFontPartial, viewportTimingLine,
} from '../engine/captureResult.js';

test('isFontPartial and captureTimings pin shapes', () => {
  assert.equal(isFontPartial('cap'), true);
  assert.equal(isFontPartial('ready'), false);
  assert.deepEqual(captureTimings({ gotoMs: 1, scrollMs: 2, fontMs: 3, shotMs: 4 }), {
    gotoMs: 1, idleMs: 0, scrollMs: 2, fontMs: 3, shotMs: 4,
  });
});

test('buildCapturePayload omits empty leadHtml', () => {
  const base = buildCapturePayload({ violations: [] }, { gotoMs: 1 }, false, '');
  assert.equal('leadHtml' in base, false);
  assert.equal(buildCapturePayload({}, {}, true, '<html>').leadHtml, '<html>');
});

test('viewportTimingLine formats or stays empty', () => {
  assert.equal(viewportTimingLine('mobile', null), '');
  assert.match(viewportTimingLine('mobile', { gotoMs: 1, idleMs: 0, scrollMs: 2, fontMs: 3, shotMs: 4 }), /viewport mobile/);
});
