import test from 'node:test';
import assert from 'node:assert/strict';
import {
  CATEGORY_CAP, letterGrade, scoreFromClusters,
} from '../report/severityScore.js';

test('letterGrade pins UK-facing bands', () => {
  assert.equal(letterGrade(95), 'A');
  assert.equal(letterGrade(80), 'B');
  assert.equal(letterGrade(70), 'C');
  assert.equal(letterGrade(55), 'D');
  assert.equal(letterGrade(10), 'F');
});

test('scoreFromClusters caps a single category so spam cannot tank the score alone', () => {
  const manyContrast = Array.from({ length: 20 }, () => ({
    severity: 'error', rule: 'wcag-contrast',
  }));
  const scored = scoreFromClusters(manyContrast);
  assert.equal(scored.categoryPenalties.wcagContrast.applied, CATEGORY_CAP.wcagContrast);
  assert.equal(scored.score, 100 - CATEGORY_CAP.wcagContrast);
  assert.ok(scored.uncappedPenalty > CATEGORY_CAP.wcagContrast);
});

test('one missing-title-scale error hurts more than capped contrast spam relative to distinct clusters', () => {
  const contrastSpam = Array.from({ length: 10 }, () => ({ severity: 'error', rule: 'wcag-contrast' }));
  const mixed = [
    ...contrastSpam,
    { severity: 'error', rule: 'h-overflow' },
    { severity: 'error', rule: 'target-size-minimum' },
  ];
  const a = scoreFromClusters(contrastSpam);
  const b = scoreFromClusters(mixed);
  assert.ok(b.score < a.score);
});
