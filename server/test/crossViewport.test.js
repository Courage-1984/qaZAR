import test from 'node:test';
import assert from 'node:assert/strict';
import { crossViewportViolations } from '../queue/crossViewport.js';

test('crossViewportViolations flags tablet and mobile inversions', () => {
  const { tablet, mobile } = crossViewportViolations({
    deskH1: 32, tabH1: 38, mobH1: 40, mobBody: 16,
  });
  assert.equal(tablet.length, 1);
  assert.equal(tablet[0].rule, 'heading-scale-inverted');
  assert.match(tablet[0].detail, /Tablet H1/);
  assert.ok(mobile.some((v) => v.rule === 'heading-scale-inverted'));
});

test('crossViewportViolations flags static and undersized mobile headings', () => {
  const staticOnly = crossViewportViolations({ deskH1: 32, mobH1: 32, mobBody: 16 });
  assert.ok(staticOnly.mobile.some((v) => v.rule === 'heading-scale-static'));
  assert.equal(staticOnly.tablet.length, 0);

  const under = crossViewportViolations({ deskH1: 32, mobH1: 14, mobBody: 16 });
  assert.ok(under.mobile.some((v) => v.rule === 'heading-scale-undersized'));
  assert.equal(under.mobile.some((v) => v.rule === 'heading-scale-inverted'), false);
});

test('crossViewportViolations flags static H2 when desktop is large', () => {
  const { mobile } = crossViewportViolations({
    deskH1: 40, mobH1: 30, deskH2: 26, mobH2: 26, mobBody: 16,
  });
  assert.ok(mobile.some((v) => v.rule === 'heading-scale-static' && v.selector === 'h2'));
});
