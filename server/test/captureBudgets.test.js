import test from 'node:test';
import assert from 'node:assert/strict';
import {
  FREEZE_CSS, LEAD_HTML_CAP, captureBudgets, screenshotOptions,
} from '../engine/captureBudgets.js';

test('captureBudgets pins fast vs normal scroll and font caps', () => {
  assert.deepEqual(captureBudgets(false), { scrollBudgetMs: 2500, fontCapMs: 1500, settleMs: 50 });
  assert.deepEqual(captureBudgets(true), { scrollBudgetMs: 1200, fontCapMs: 800, settleMs: 0 });
  assert.match(FREEZE_CSS, /animation:none/);
  assert.equal(LEAD_HTML_CAP, 1_500_000);
});

test('screenshotOptions clips only when taller than maxShotHeight', () => {
  const full = screenshotOptions('/tmp/a.png', { height: 1000, width: 390, maxShotHeight: 8000 });
  assert.equal(full.fullPage, true);
  assert.equal(full.clip, undefined);
  const clipped = screenshotOptions('/tmp/b.png', { height: 9000, width: 390, maxShotHeight: 8000 });
  assert.deepEqual(clipped.clip, { x: 0, y: 0, width: 390, height: 8000 });
  assert.equal(clipped.animations, 'disabled');
});
